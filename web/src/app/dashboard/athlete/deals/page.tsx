import type { Metadata } from 'next'
import Link from 'next/link'

import { Card, DashboardStatCard, PageHeader } from '@/components/dashboard/dashboard-ui'

export const metadata: Metadata = {
  title: 'Deals',
}

const DEALS = [
  {
    title: 'Apex Electrolyte Launch',
    brand: 'Apex Nutrition',
    value: '$3,500',
    status: 'ACTIVE',
    stage: 'Negotiation',
    updated: '2h ago',
  },
  {
    title: 'UrbanFit Social Takeover',
    brand: 'UrbanFit Co.',
    value: '$1,800',
    status: 'PENDING',
    stage: 'Athlete review',
    updated: '1d ago',
  },
  {
    title: 'TechGear Pro Endorsement',
    brand: 'TechGear',
    value: '$5,000',
    status: 'COMPLETED',
    stage: 'Closed',
    updated: '5d ago',
  },
  {
    title: 'Campus Grill Seasonal Spot',
    brand: 'Campus Grill',
    value: '$900',
    status: 'DRAFT',
    stage: 'Draft',
    updated: '1w ago',
  },
]

const STATUS_TONES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-brand-tint text-brand',
  DRAFT: 'bg-muted text-muted-foreground',
}

export default function AthleteDealsPage() {
  return (
    <div>
      <PageHeader
        title="Deals"
        description="Deal inquiries, contracts, and deliverables — all in one audited view."
      >
        <Link
          href="/dashboard/athlete/profile/edit"
          className="inline-flex items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
        >
          Update media kit
        </Link>
      </PageHeader>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard label="Active deals" value="2" hint="1 in negotiation" />
        <DashboardStatCard label="Pending review" value="1" hint="Needs your decision" />
        <DashboardStatCard label="Completed" value="6" hint="All-time" />
        <DashboardStatCard label="Pipeline value" value="$7,300" hint="Active + pending" />
      </div>

      <Card title="All deals" className="mt-8">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 pr-4 font-semibold">Deal</th>
                <th className="pb-3 pr-4 font-semibold">Brand</th>
                <th className="pb-3 pr-4 font-semibold">Value</th>
                <th className="pb-3 pr-4 font-semibold">Status</th>
                <th className="pb-3 pr-4 font-semibold">Stage</th>
                <th className="pb-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {DEALS.map((deal) => (
                <tr key={deal.title} className="transition hover:bg-muted/20">
                  <td className="py-3.5 pr-4 font-semibold text-ink">{deal.title}</td>
                  <td className="py-3.5 pr-4 text-muted-foreground">{deal.brand}</td>
                  <td className="py-3.5 pr-4 font-display font-extrabold text-ink">{deal.value}</td>
                  <td className="py-3.5 pr-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONES[deal.status] ?? 'bg-muted text-muted-foreground'}`}
                    >
                      {deal.status}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-muted-foreground">{deal.stage}</td>
                  <td className="py-3.5 text-muted-foreground">{deal.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Deliverables due" className="mt-6">
        <ul className="space-y-4">
          {[
            ['Post 1 — Launch announcement', 'Apex Electrolyte Launch', 'Sep 10'],
            ['Reel — Behind the scenes', 'UrbanFit Social Takeover', 'Sep 18'],
            ['Story pack — 3 images', 'Apex Electrolyte Launch', 'Sep 24'],
          ].map(([deliverable, deal, due]) => (
            <li key={deliverable} className="flex items-center gap-3">
              <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{deliverable}</p>
                <p className="text-xs text-muted-foreground">{deal}</p>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-semibold text-brand">
                Due {due}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
