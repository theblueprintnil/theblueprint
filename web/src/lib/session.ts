import { auth, currentUser } from '@clerk/nextjs/server'
import { prismaAuth } from './db'
import { DatabaseConnectionError, ServiceUnavailableError } from './errors'

const MAX_RETRIES = 3
const INITIAL_BACKOFF_MS = 500
const MAX_BACKOFF_MS = 4000

function isTransientError(error: unknown): boolean {
  if (error instanceof ServiceUnavailableError || error instanceof DatabaseConnectionError) {
    return error.isTransient
  }
  const message = error instanceof Error ? error.message.toLowerCase() : String(error)
  return (
    message.includes('503') ||
    message.includes('service unavailable') ||
    message.includes('connection refused') ||
    message.includes('connection reset') ||
    message.includes('too many clients') ||
    message.includes('pool') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('network') ||
    message.includes('deadlock')
  )
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = MAX_RETRIES,
  context = 'operation',
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (!isTransientError(error)) {
        throw error
      }

      if (attempt < maxRetries) {
        const backoff = Math.min(
          INITIAL_BACKOFF_MS * Math.pow(2, attempt),
          MAX_BACKOFF_MS,
        )
        console.warn(
          `[Session] Transient error in ${context}, attempt ${attempt + 1}/${maxRetries + 1}, backing off ${backoff}ms:`,
          error instanceof Error ? error.message : String(error),
        )
        await sleep(backoff)
      }
    }
  }

  throw lastError
}

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  currentOrganizationId: string | null
}

function toSessionUser(user: {
  id: string
  email: string
  name: string
  role: string
  currentOrganizationId: string | null
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    currentOrganizationId: user.currentOrganizationId,
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const { userId } = await auth()
    if (!userId) return null
    const clerkUser = await currentUser()
    if (!clerkUser) return null
    const primaryEmail =
      clerkUser.emailAddresses.find((entry) => entry.id === clerkUser.primaryEmailAddressId)
        ?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      null
    if (!primaryEmail) return null
    const email = primaryEmail.toLowerCase()
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ').trim() || email

    const existing = await withRetry(
      () => prismaAuth.user.findUnique({ where: { email } }),
      MAX_RETRIES,
      'findUser',
    )
    if (existing) {
      return toSessionUser(existing)
    }

    const created = await withRetry(
      async () =>
        prismaAuth.user
          .create({
            data: { email, name, passwordHash: 'clerk-managed' },
          })
          .catch(async () => prismaAuth.user.findUnique({ where: { email } })),
      MAX_RETRIES,
      'createUser',
    )
    if (!created) return null
    return toSessionUser(created)
  } catch (error) {
    console.error('[Session] Failed to retrieve session user:', error)
    return null
  }
}
