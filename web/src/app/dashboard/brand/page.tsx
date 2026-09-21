import type { Metadata } from 'next'
import Link from 'next/link'

import { Card, DashboardStatCard, PageHeader } from '@/components/dashboard/dashboard-ui'

export const metadata: Metadata = {
  title: 'Brand overview',
}

const CAMPAIGNS = [
  {
    name: 'Fall Hydration Ambassador',
    status: 'Active',
    budget: '$8,000',
    spend: '$3,250',
    athletes: 3,
    ends: 'Sep 30',
  },
  {
    name: 'Back-to-School Apparel',
    status: 'Briefing',
    budget: '$5,500',
    spend: '$0',
    athletes: 0,
    ends: 'Not started',
  },
  {
    name: 'Holiday Social Sprint',
    status: 'Draft',
    budget: '$12,000',
    spend: '$0',
    athletes: 0,
    ends: 'Not started',
  },
]

const ACTIVE_DEALS = [
  {
    deal: 'Apex Electrolyte Launch',
    athlete: 'Jordan Carter',
    value: '$3,500',
    stage: 'Negotiation',
  },
  { deal: 'UrbanFit Takeover', athlete: 'Maya Reyes', value: '$1,800', stage: 'Contract review' },
]

const STATUS_TONES: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700',
  Briefing: 'bg-brand-tint text-brand',
  Draft: 'bg-muted text-muted-foreground',
}

export default function BrandDashboardPage() {
  return (
    <div>
      <PageHeader
        title="Campaign management"
        description="Run every athlete partnership from one dashboard."
      >
        <Link
          href="/dashboard/brand/campaigns/new"
          className="inline-flex items-center justify-center rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,127,255,0.32)] transition hover:opacity-90"
        >
          New campaign
        </Link>
      </PageHeader>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard label="Active campaigns" value="1" hint="2 in preparation" />
        <DashboardStatCard label="Active deals" value="2" hint="Across 2 athletes" />
        <DashboardStatCard label="Budget committed" value="$13,500" hint="This quarter" />
        <DashboardStatCard label="Deliverables due" value="4" hint="In the next 14 days" />
      </div>

      <Card
        title="Campaigns"
        className="mt-8"
        action={
          <Link
            href="/dashboard/brand/campaigns/new"
            className="text-sm font-semibold text-brand hover:underline"
          >
            Create campaign
          </Link>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 pr-4 font-semibold">Campaign</th>
                <th className="pb-3 pr-4 font-semibold">Status</th>
                <th className="pb-3 pr-4 font-semibold">Budget</th>
                <th className="pb-3 pr-4 font-semibold">Spend</th>
                <th className="pb-3 pr-4 font-semibold">Athletes</th>
                <th className="pb-3 font-semibold">Ends</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {CAMPAIGNS.map((campaign) => (
                <tr key={campaign.name} className="transition hover:bg-muted/20">
                  <td className="py-3.5 pr-4 font-semibold text-ink">{campaign.name}</td>
                  <td className="py-3.5 pr-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONES[campaign.status] ?? 'bg-muted text-muted-foreground'}`}
                    >
                      {campaign.status}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 font-display font-extrabold text-ink">
                    {campaign.budget}
                  </td>
                  <td className="py-3.5 pr-4 text-muted-foreground">{campaign.spend}</td>
                  <td className="py-3.5 pr-4 text-muted-foreground">{campaign.athletes}</td>
                  <td className="py-3.5 text-muted-foreground">{campaign.ends}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card
          title="Active deals"
          className="lg:col-span-2"
          action={
            <Link
              href="/dashboard/brand/deals/deal-1"
              className="text-sm font-semibold text-brand hover:underline"
            >
              Open workspace
            </Link>
          }
        >
          <ul className="divide-y divide-border/70">
            {ACTIVE_DEALS.map((deal) => (
              <li
                key={deal.deal}
                className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{deal.deal}</p>
                  <p className="text-sm text-muted-foreground">{deal.athlete}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-display text-sm font-extrabold text-ink">{deal.value}</span>
                  <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-semibold text-brand">
                    {deal.stage}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Compliance health">
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center justify-between gap-3">
              <span>Disclosures up to date</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                2 / 2
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Contracts with verified athletes</span>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                2 / 2
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span>Pending consent items</span>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                1
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
