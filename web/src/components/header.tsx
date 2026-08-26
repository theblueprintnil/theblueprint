import { OrganizationSwitcher } from './organization-switcher'
import type { UserOrganization } from '@/lib/organizations'

interface HeaderProps {
  userName: string
  organizations: UserOrganization[]
  activeOrganizationId: string | null
}

export function Header({ userName, organizations, activeOrganizationId }: HeaderProps) {
  const initials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-zinc-200 bg-white px-4">
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold tracking-tight text-zinc-900">The Blueprint</span>
      </div>
      <OrganizationSwitcher
        organizations={organizations}
        activeOrganizationId={activeOrganizationId}
      />
      <div className="ml-auto flex items-center gap-4 text-sm text-zinc-400">
        <span className="hidden text-zinc-500 md:inline">Search</span>
        <span>Alerts</span>
        <span>Help</span>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white"
          aria-label="Account"
        >
          {initials || '?'}
        </div>
      </div>
    </header>
  )
}
