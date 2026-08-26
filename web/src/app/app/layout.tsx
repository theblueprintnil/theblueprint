import type { ReactNode } from 'react'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { getSessionUser } from '@/lib/session'
import { getUserOrganizations, resolveActiveOrganization } from '@/lib/organizations'

const ORG_COOKIE = 'blueprint_org'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }
  const store = await cookies()
  const preferredOrgId = store.get(ORG_COOKIE)?.value ?? null
  const active = await resolveActiveOrganization(user.id, preferredOrgId)
  if (!active) {
    redirect('/onboarding')
  }
  const organizations = await getUserOrganizations(user.id)
  return (
    <AppShell user={user} organizations={organizations} activeOrganizationId={active.id}>
      {children}
    </AppShell>
  )
}
