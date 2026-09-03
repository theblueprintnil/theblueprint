import type { Metadata } from 'next'

import { Card, DashboardStatCard, PageHeader } from '@/components/dashboard/dashboard-ui'

export const metadata: Metadata = {
  title: 'Earnings',
}

const PAYOUTS = [
  { deal: 'TechGear Pro Endorsement', amount: '$5,000', status: 'Paid', method: 'ACH · Bank ending 4242', date: 'Aug 28, 2026' },
  { deal: 'Apex Electrolyte Launch (installment 1)', amount: '$1,750', status: 'Scheduled', method: 'ACH · Bank ending 4242', date: 'Sep 15, 2026' },
  { deal: 'UrbanFit Social Takeover', amount: '$1,800', status: 'Pending', method: 'Awaiting milestone', date: '—' },
]

const STATUS_TONES: Record<string, string> = {
  Paid: 'bg-emerald-100 text-emerald-700',
  Scheduled: 'bg-brand-tint text-brand',
  Pending: 'bg-amber-100 text-amber-700',
}

export default function AthleteEarningsPage() {
  return (
    <div>
      <PageHeader
        title="Earnings"
        description="Financials, payouts, and tax setup for your NIL business."
      />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard label="Earned this month" value="$4,250" hint="Across 2 active deals" />
        <DashboardStatCard label="Pending approval" value="$1,800" hint="1 deal awaiting milestone" />
        <DashboardStatCard label="Paid to date" value="$12,500" hint="Lifecycle to date" />
        <DashboardStatCard label="Tax withheld (est.)" value="$2,875" hint="23% reserve estimate" />
      </div>

      <Card title="Payout history" className="mt-8">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 pr-4 font-semibold">Deal</th>
                <th className="pb-3 pr-4 font-semibold">Amount</th>
                <th className="pb-3 pr-4 font-semibold">Status</th>
                <th className="pb-3 pr-4 font-semibold">Method</th>
                <th className="pb-3 font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {PAYOUTS.map((payout) => (
                <tr key={payout.deal} className="transition hover:bg-muted/20">
                  <td className="py-3.5 pr-4 font-semibold text-ink">{payout.deal}</td>
                  <td className="py-3.5 pr-4 font-display font-extrabold text-ink">{payout.amount}</td>
                  <td className="py-3.5 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_TONES[payout.status] ?? 'bg-muted text-muted-foreground'}`}>
                      {payout.status}
                    </span>
                  </td>
                  <td className="py-3.5 pr-4 text-muted-foreground">{payout.method}</td>
                  <td className="py-3.5 text-muted-foreground">{payout.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Tax setup">
          <div className="space-y-4">
            <Field label="Legal name">
              <input defaultValue="Jordan M. Carter" className={INPUT} />
            </Field>
            <Field label="Tax identification (EIN or SSN)">
              <input defaultValue="•••-••-4821" className={INPUT} />
            </Field>
            <Field label="Payout account">
              <select defaultValue="ach" className={INPUT}>
                <option value="ach">ACH · Bank ending 4242</option>
                <option value="paypal">PayPal</option>
              </select>
            </Field>
            <div className="flex justify-end">
              <button
                type="button"
                className="rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,127,255,0.32)] transition hover:opacity-90"
              >
                Save tax setup
              </button>
            </div>
          </div>
        </Card>

        <Card title="Tax & compliance notes">
          <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-3">
              <CheckIcon />
              NIL income is generally taxable. The Blueprint does not provide tax advice — consult a qualified tax professional.
            </li>
            <li className="flex gap-3">
              <CheckIcon />
              Disclosure forms (e.g., school or state requirements) may depend on deal amounts and timing.
            </li>
            <li className="flex gap-3">
              <CheckIcon />
              A 1099 may be issued when payments cross the annual threshold.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  )
}

function CheckIcon() {
  return (
    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-tint text-brand">
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
        <path d="M3.5 8.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

const INPUT =
  'w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-white'
