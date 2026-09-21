'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'

export interface DashboardNavItem {
  label: string
  href: string
}

export interface DashboardNavSection {
  title: string
  items: DashboardNavItem[]
}

interface DashboardShellProps {
  workspaceLabel: string
  sections: DashboardNavSection[]
  userName: string
  children: ReactNode
}

export function DashboardShell({
  workspaceLabel,
  sections,
  userName,
  children,
}: DashboardShellProps) {
  const pathname = usePathname()
  return (
    <div className="flex min-h-screen bg-zinc-50">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-white lg:block">
        <div className="flex h-full flex-col gap-6 overflow-y-auto p-4">
          <Link href="/" className="px-3 pt-2">
            <span className="font-display text-lg font-extrabold tracking-tight text-ink">
              The Blueprint
            </span>
            <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.22em] text-brand">
              {workspaceLabel}
            </span>
          </Link>
          {sections.map((section) => (
            <nav key={section.title} aria-label={section.title}>
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-brand-tint hover:text-brand',
                        active && 'bg-brand-tint text-brand',
                      )}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </nav>
          ))}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-white px-6">
          <Link href="/" className="text-sm font-semibold text-brand transition hover:underline">
            ← Back to public site
          </Link>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="hidden sm:inline">{userName}</span>
            <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
              {initials(userName)}
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-6 lg:p-10">{children}</main>
      </div>
    </div>
  )
}

function initials(name: string): string {
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return parts || '?'
}
