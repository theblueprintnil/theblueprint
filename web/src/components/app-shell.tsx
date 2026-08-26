import type { ReactNode } from 'react'
import { Header } from './header'
import { Sidebar } from './sidebar'
import type { SessionUser } from '@/lib/session'
import type { UserOrganization } from '@/lib/organizations'

interface AppShellProps {
  user: SessionUser
  organizations: UserOrganization[]
  activeOrganizationId: string | null
  children: ReactNode
}

export function AppShell({ user, organizations, activeOrganizationId, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <Header
        userName={user.name}
        organizations={organizations}
        activeOrganizationId={activeOrganizationId}
      />
      <div className="flex flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
