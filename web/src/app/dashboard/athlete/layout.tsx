import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { getSessionUser } from '@/lib/session'

const SECTIONS = [
  {
    title: 'Athlete studio',
    items: [
      { label: 'Overview', href: '/dashboard/athlete' },
      { label: 'Profile & media kit', href: '/dashboard/athlete/profile/edit' },
      { label: 'Deals', href: '/dashboard/athlete/deals' },
      { label: 'Earnings', href: '/dashboard/athlete/earnings' },
    ],
  },
]

export default async function AthleteDashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }
  return (
    <DashboardShell workspaceLabel="Athlete dashboard" sections={SECTIONS} userName={user.name}>
      {children}
    </DashboardShell>
  )
}
