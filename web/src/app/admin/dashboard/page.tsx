import type { Metadata } from 'next'

import { Card, DashboardStatCard, PageHeader } from '@/components/dashboard/dashboard-ui'

export const metadata: Metadata = {
  title: 'Admin dashboard',
}

const USERS = [
  { name: 'Jordan Carter', email: 'jordan.carter@state.edu', role: 'ATHLETE', status: 'Verified' },
  { name: 'Apex Nutrition', email: 'partnerships@apexnutrition.com', role: 'BRAND', status: 'Verified' },
  { name: 'Priya Sharma', email: 'priya.sharma@eastbridge.edu', role: 'ATHLETE', status: 'Pending' },
  { name: 'Coastal Wellness', email: 'hello@coastalwellness.com', role: 'BRAND', status: 'Active' },
]

const STATUS_TONES: Record<string, string> = {
  Verified: 'bg-emerald-100 text-emerald-700',
  Pending: 'bg-amber-100 text-amber-700',
  Active: 'bg-brand-tint text-brand',
}

export default function AdminDashboardPage() {
  return (
    <div>
      <PageHeader
        title="Platform overview"
        description="System administration and user oversight."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard label="Registered athletes" value="2,418" hint="+126 this month" />
        <DashboardStatCard label="Registered brands" value="184" hint="+14 this month" />
        <DashboardStatCard label="Organizations" value="1,932" hint="Across all workspaces" />
        <DashboardStatCard label="Verification queue" value="37" hint="Needs review" />
      </div>

      <Card title="User oversight" className="mt-8">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 pr-4 font-semibold">Name</th>
                <th className="pb-3 pr-4 font-semibold">Email</th>
                <th className="pb-3 pr-4 font-semibold">Role</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {USERS.map((user) => (
                <tr key={user.email} className="transition hover:bg-muted/20">
                  <td className="py-3.5 pr-4 font-semibold text-ink">{user.name}</td>
                  <td className="py-3.5 pr-4 text-muted-foreground">{user.email}</td>
                  <td className="py-3.5 pr-4">
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONES[user.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {user.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Recent audit events">
          <ul className="space-y-3 text-sm text-muted-foreground">
            {[
              ['Apex Nutrition', 'approved contract v3 on deal deal-1', '2h ago'],
              ['Support agent', 'impersonated tenant carter-athletics for 14m', '5h ago'],
              ['Jordan Carter', 'published media kit v2', '1d ago'],
            ].map(([actor, action, time]) => (
              <li key={`${actor}-${action}`} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                <p className="min-w-0 flex-1">
                  <span className="font-semibold text-ink">{actor}</span> {action}
                </p>
                <span className="shrink-0 text-xs">{time}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Plan & entitlement distribution">
          <ul className="space-y-3 text-sm">
            {[
              ['Demo', '1,204 orgs', 62],
              ['Starter', '486 orgs', 25],
              ['Growth', '214 orgs', 11],
              ['Premium', '28 orgs', 2],
            ].map(([plan, count, percent]) => (
              <li key={plan as string}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink">{plan}</span>
                  <span className="text-muted-foreground">{count}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full brand-gradient" style={{ width: `${percent}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
