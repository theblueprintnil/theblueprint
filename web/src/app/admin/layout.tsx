import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { getSessionUser } from '@/lib/session'

const SECTIONS = [
  {
    title: 'Platform admin',
    items: [
      { label: 'Dashboard', href: '/admin/dashboard' },
      { label: 'Compliance', href: '/admin/compliance' },
    ],
  },
]

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }
  if (user.role !== 'ADMIN') {
    redirect('/app/dashboard')
  }
  return (
    <DashboardShell workspaceLabel="Platform admin" sections={SECTIONS} userName={user.name}>
      {children}
    </DashboardShell>
  )
}
