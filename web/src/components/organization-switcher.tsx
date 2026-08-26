'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { UserOrganization } from '@/lib/organizations'
import { can, roleLabel } from '@/lib/permissions'

interface OrganizationSwitcherProps {
  organizations: UserOrganization[]
  activeOrganizationId: string | null
}

export function OrganizationSwitcher({
  organizations,
  activeOrganizationId,
}: OrganizationSwitcherProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const active =
    organizations.find((org) => org.id === activeOrganizationId) ?? organizations[0] ?? null

  async function switchTo(organizationId: string) {
    setOpen(false)
    await fetch(`/api/organizations/${organizationId}/switch`, { method: 'POST' })
    startTransition(() => {
      router.push('/app/dashboard')
      router.refresh()
    })
  }

  if (!active) {
    return (
      <span className="rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-sm text-zinc-400">
        No organization
      </span>
    )
  }

  return (
    <div className="relative">
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
      >
        <span className="max-w-40 truncate">{active.name}</span>
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-semibold text-zinc-600">
          {roleLabel(active.role)}
        </span>
        <span className="text-xs text-zinc-400" aria-hidden>
          ▾
        </span>
      </button>
      {open && organizations.length > 0 ? (
        <div className="absolute left-0 top-full z-20 mt-2 w-64 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg">
          {organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              onClick={() => switchTo(org.id)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100"
            >
              <span className="max-w-36 truncate">{org.name}</span>
              <span className="flex items-center gap-1.5">
                {canManage(org.role) ? (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                    title="Can manage members"
                  />
                ) : null}
                <span className="text-xs font-medium text-zinc-500">{roleLabel(org.role)}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function canManage(role: UserOrganization['role']): boolean {
  return can(role, 'manage_members')
}
