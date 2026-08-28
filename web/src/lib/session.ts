import { cookies } from 'next/headers'
import { prismaAuth } from './db'
import { hashToken, SESSION_COOKIE } from './auth'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: string
  currentOrganizationId: string | null
}
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const session = await prismaAuth.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await prismaAuth.session.delete({ where: { id: session.id } }).catch(() => undefined)
    return null
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    currentOrganizationId: session.user.currentOrganizationId ?? null,
  }
}
