'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'

const studioNav = [
  { label: 'Dashboard', href: '/app/dashboard' },
  { label: 'Brand profile', href: '/app/brand' },
  { label: 'Content studio', href: '/app/studio' },
  { label: 'Media kit', href: '/app/media-kit' },
  { label: 'Opportunities', href: '/app/opportunities' },
  { label: 'Deals & contracts', href: '/app/deals' },
]

const agencyNav = [
  { label: 'Agency dashboard', href: '/app/agency/dashboard' },
  { label: 'Athlete roster', href: '/app/agency/athletes' },
  { label: 'Deal pipeline', href: '/app/agency/deals' },
  { label: 'Contracts & documents', href: '/app/agency/contracts' },
  { label: 'Content & campaigns', href: '/app/agency/content' },
  { label: 'Agency team', href: '/app/agency/team' },
  { label: 'Reports', href: '/app/agency/reports' },
]

const settingsNav = [
  { label: 'Team', href: '/app/settings/team' },
  { label: 'Billing', href: '/app/settings/billing' },
  { label: 'Workspace', href: '/app/settings/workspace' },
  { label: 'Security', href: '/app/settings/security' },
]

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(`${href}/`)
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900',
        active && 'bg-zinc-100 text-zinc-900',
      )}
    >
      {label}
    </Link>
  )
}

function NavSection({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink key={item.href} {...item} />
        ))}
      </div>
    </div>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-zinc-200 bg-white md:block">
      <nav className="flex h-full flex-col gap-6 overflow-y-auto p-4">
        <NavSection title="Athlete studio" items={studioNav} />
        <NavSection title="Agency workspace" items={agencyNav} />
        <NavSection title="Settings" items={settingsNav} />
      </nav>
    </aside>
  )
}
