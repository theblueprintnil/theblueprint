import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'

import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { getSessionUser } from '@/lib/session'

const SECTIONS = [
  {
    title: 'Brand workspace',
    items: [
      { label: 'Overview', href: '/dashboard/brand' },
      { label: 'Campaigns', href: '/dashboard/brand/campaigns/new' },
      { label: 'Deals', href: '/dashboard/brand' },
    ],
  },
]

export default async function BrandDashboardLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }
  return (
    <DashboardShell workspaceLabel="Brand dashboard" sections={SECTIONS} userName={user.name}>
      {children}
    </DashboardShell>
  )
}
