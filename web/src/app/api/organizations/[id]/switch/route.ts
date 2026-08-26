import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prismaAuth } from '@/lib/db'
import { getMembershipRole } from '@/lib/organizations'
import { getSessionUser } from '@/lib/session'

const ORG_COOKIE = 'blueprint_org'

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { id } = await context.params
  const role = await getMembershipRole(user.id, id)
  if (!role) {
    return NextResponse.json({ error: 'not a member of this organization' }, { status: 403 })
  }
  await prismaAuth.user.update({
    where: { id: user.id },
    data: { currentOrganizationId: id },
  })
  const store = await cookies()
  store.set(ORG_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
  return NextResponse.json({ ok: true, organizationId: id, role })
}
