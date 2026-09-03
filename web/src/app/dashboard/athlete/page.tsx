import Link from 'next/link'

import { Card, DashboardStatCard, PageHeader } from '@/components/dashboard/dashboard-ui'

const RECENT_DEALS = [
  { title: 'Apex Electrolyte Launch', brand: 'Apex Nutrition', value: '$3,500', status: 'Negotiation', tone: 'brand' },
  { title: 'UrbanFit Social Takeover', brand: 'UrbanFit Co.', value: '$1,800', status: 'Athlete review', tone: 'amber' },
  { title: 'TechGear Pro Endorsement', brand: 'TechGear', value: '$5,000', status: 'Completed', tone: 'green' },
]

const ACTIVITY = [
  ['Apex Nutrition', 'requested a contract revision', '2 hours ago'],
  ['UrbanFit Co.', 'sent a new offer for review', 'Yesterday'],
  ['You', 'updated your media kit and social links', '2 days ago'],
  ['TechGear', 'marked the final deliverable as accepted', '5 days ago'],
]

const STATUS_TONES: Record<string, string> = {
  brand: 'bg-brand-tint text-brand',
  amber: 'bg-amber-100 text-amber-700',
  green: 'bg-emerald-100 text-emerald-700',
}

export default function AthleteOverviewPage() {
  return (
    <div>
      <PageHeader
        title="Overview"
        description="Good to see you, Jordan. Here is what is happening with your brand."
      >
        <Link
          href="/dashboard/athlete/profile/edit"
          className="inline-flex items-center justify-center rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,127,255,0.32)] transition hover:opacity-90"
        >
          Edit profile & media kit
        </Link>
      </PageHeader>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard label="Audience" value="125K" hint="+4.2% this month" />
        <DashboardStatCard label="Engagement" value="6.2%" hint="vs 5.8% industry avg" />
        <DashboardStatCard label="Media kit views" value="142" hint="+18% in the last 30 days" />
        <DashboardStatCard label="Active offers" value="3" hint="1 needs your review" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card
          title="Deals in flight"
          className="lg:col-span-2"
          action={
            <Link href="/dashboard/athlete/deals" className="text-sm font-semibold text-brand hover:underline">
              View all
            </Link>
          }
        >
          <ul className="divide-y divide-border/70">
            {RECENT_DEALS.map((deal) => (
              <li key={deal.title} className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{deal.title}</p>
                  <p className="text-sm text-muted-foreground">{deal.brand}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-display text-sm font-extrabold text-ink">{deal.value}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONES[deal.tone] ?? 'bg-muted text-muted-foreground'}`}>
                    {deal.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Earnings snapshot" action={<Link href="/dashboard/athlete/earnings" className="text-sm font-semibold text-brand hover:underline">Details</Link>}>
          <dl className="space-y-4">
            {[
              ['Earned this month', '$4,250'],
              ['Pending approval', '$1,800'],
              ['Paid to date', '$12,500'],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="font-display text-base font-extrabold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card title="Recent activity" className="mt-6">
        <ul className="space-y-4">
          {ACTIVITY.map(([actor, action, time]) => (
            <li key={`${actor}-${action}`} className="flex items-start gap-3">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-ink">{actor}</span> {action}
              </p>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">{time}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
