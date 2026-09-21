import type { Metadata } from 'next'
import Link from 'next/link'

import { Card, PageHeader } from '@/components/dashboard/dashboard-ui'

type DealWorkspacePageProps = {
  params: Promise<{ dealId: string }>
}

export async function generateMetadata({ params }: DealWorkspacePageProps): Promise<Metadata> {
  const { dealId } = await params
  return { title: `Deal ${dealId}` }
}

const MESSAGES = [
  {
    from: 'Apex Nutrition',
    body: 'Hi Jordan — attached v3 of the contract with the revised usage window. Can you confirm the deliverable dates still work?',
    time: 'Mon 9:14 AM',
  },
  {
    from: 'Jordan Carter',
    body: 'Dates look good. I shared the updated deliverable calendar with my team — we can lock it in.',
    time: 'Mon 10:02 AM',
  },
  {
    from: 'Apex Nutrition',
    body: "Perfect. We'll finalize the disclosure checklist and send the signature request by Wednesday.",
    time: 'Mon 10:18 AM',
  },
]

const MILESTONES = [
  { label: 'Contract signed', status: 'Pending', due: 'Sep 12' },
  { label: 'Deliverable 1 — Launch post', status: 'Not started', due: 'Sep 20' },
  { label: 'Deliverable 2 — Story pack', status: 'Not started', due: 'Sep 24' },
  { label: 'Disclosure submitted', status: 'Pending', due: 'Sep 25' },
]

export default async function BrandDealWorkspacePage({ params }: DealWorkspacePageProps) {
  const { dealId } = await params
  return (
    <div>
      <PageHeader title="Deal workspace" description={`Apex Electrolyte Launch · ${dealId}`}>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
            Contract review
          </span>
          <Link
            href="/dashboard/brand"
            className="rounded-full border border-border bg-white px-5 py-2 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
          >
            Back to overview
          </Link>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Messages">
            <div className="space-y-4">
              {MESSAGES.map((message) => (
                <div key={`${message.from}-${message.time}`} className="flex gap-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-tint font-display text-xs font-bold text-brand">
                    {initials(message.from)}
                  </span>
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-border bg-white p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-sm font-semibold text-ink">{message.from}</span>
                      <span className="text-xs text-muted-foreground">{message.time}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {message.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <form className="mt-6 flex gap-3">
              <input
                placeholder="Reply in this deal room…"
                aria-label="Reply message"
                className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-white"
              />
              <button
                type="button"
                className="shrink-0 rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,127,255,0.32)] transition hover:opacity-90"
              >
                Send
              </button>
            </form>
          </Card>

          <Card title="Milestones & deliverables">
            <ul className="space-y-3">
              {MILESTONES.map((milestone) => (
                <li key={milestone.label} className="flex items-center gap-3">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
                  <span className="text-sm font-semibold text-ink">{milestone.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">Due {milestone.due}</span>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {milestone.status}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Deal summary">
            <dl className="space-y-3 text-sm">
              {[
                ['Athlete', 'Jordan Carter'],
                ['Brand', 'Apex Nutrition'],
                ['Value', '$3,500'],
                ['Start', 'Sep 1, 2026'],
                ['End', 'Sep 30, 2026'],
                ['Stage', 'Contract review'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="Contract review">
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-ink">NIL Agreement — v3</span>
                <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-semibold text-brand">
                  Review
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Uploaded Sep 9 · 8 pages</p>
            </div>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                className="rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,127,255,0.32)] transition hover:opacity-90"
              >
                Request signature
              </button>
              <button
                type="button"
                className="rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
              >
                Request changes
              </button>
            </div>
          </Card>

          <Card title="Compliance checklist">
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {[
                ['Athlete verified', true],
                ['Disclosure required', true],
                ['Guardian consent', false],
                ['State rule check', true],
              ].map(([label, done]) => (
                <li key={label as string} className="flex items-center gap-2">
                  {done ? (
                    <CheckIcon />
                  ) : (
                    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700">
                      !
                    </span>
                  )}
                  {label}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function CheckIcon() {
  return (
    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
      <svg
        viewBox="0 0 12 12"
        className="h-2.5 w-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        aria-hidden
      >
        <path d="M2.5 6.5l2.3 2.3 4.7-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
