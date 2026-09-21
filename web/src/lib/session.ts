import { auth, currentUser } from '@clerk/nextjs/server'
import { prismaAuth } from './db'

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
    const existing = await prismaAuth.user.findUnique({ where: { email } })
    if (existing) {
      return toSessionUser(existing)
    }
    const created = await prismaAuth.user
      .create({
        data: { email, name, passwordHash: 'clerk-managed' },
      })
      .catch(async () => prismaAuth.user.findUnique({ where: { email } }))
    if (!created) return null
    return toSessionUser(created)
  } catch {
    return null
  }
}
