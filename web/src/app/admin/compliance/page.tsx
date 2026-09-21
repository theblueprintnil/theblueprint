import type { Metadata } from 'next'

import { Card, PageHeader } from '@/components/dashboard/dashboard-ui'

export const metadata: Metadata = {
  title: 'Compliance queue',
}

const VERIFICATION_QUEUE = [
  {
    name: 'Priya Sharma',
    sport: 'Tennis',
    school: 'Eastbridge University',
    submitted: 'Sep 1, 2026',
    status: 'Pending',
  },
  {
    name: 'Eli Johnson',
    sport: 'Football',
    school: 'Riverside State',
    submitted: 'Aug 30, 2026',
    status: 'Pending',
  },
  {
    name: 'Nia Thompson',
    sport: 'Soccer',
    school: 'Pacific Coast University',
    submitted: 'Aug 29, 2026',
    status: 'Pending',
  },
]

const DISCLOSURE_QUEUE = [
  {
    deal: 'Apex Electrolyte Launch',
    athlete: 'Jordan Carter',
    issue: 'State disclosure reminder due Sep 25',
    priority: 'High',
  },
  {
    deal: 'UrbanFit Social Takeover',
    athlete: 'Maya Reyes',
    issue: 'Guardian consent not yet recorded',
    priority: 'High',
  },
  {
    deal: 'Campus Grill Seasonal Spot',
    athlete: 'Tyler Brooks',
    issue: 'Disclosure tag missing from brief',
    priority: 'Medium',
  },
]

const PRIORITY_TONES: Record<string, string> = {
  High: 'bg-amber-100 text-amber-700',
  Medium: 'bg-brand-tint text-brand',
}

export default function AdminCompliancePage() {
  return (
    <div>
      <PageHeader
        title="Compliance queue"
        description="Athlete verification and disclosure items that need attention."
      />

      <Card title="Athlete verification" className="mt-8">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border/70 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-3 pr-4 font-semibold">Athlete</th>
                <th className="pb-3 pr-4 font-semibold">Sport</th>
                <th className="pb-3 pr-4 font-semibold">School</th>
                <th className="pb-3 pr-4 font-semibold">Submitted</th>
                <th className="pb-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {VERIFICATION_QUEUE.map((item) => (
                <tr key={item.name} className="transition hover:bg-muted/20">
                  <td className="py-3.5 pr-4 font-semibold text-ink">{item.name}</td>
                  <td className="py-3.5 pr-4 text-muted-foreground">{item.sport}</td>
                  <td className="py-3.5 pr-4 text-muted-foreground">{item.school}</td>
                  <td className="py-3.5 pr-4 text-muted-foreground">{item.submitted}</td>
                  <td className="py-3.5">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-border bg-white px-4 py-1.5 text-xs font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
                      >
                        Request info
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Disclosure review" className="mt-6">
        <ul className="space-y-4">
          {DISCLOSURE_QUEUE.map((item) => (
            <li
              key={`${item.deal}-${item.issue}`}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/20 p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{item.deal}</span>
                  <span className="text-sm text-muted-foreground">· {item.athlete}</span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${PRIORITY_TONES[item.priority] ?? 'bg-muted text-muted-foreground'}`}
                  >
                    {item.priority}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{item.issue}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-zinc-800"
                >
                  Mark resolved
                </button>
                <button
                  type="button"
                  className="rounded-full border border-border bg-white px-4 py-1.5 text-xs font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
                >
                  Escalate
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Compliance framework notes" className="mt-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Verification status on the platform indicates identity steps completed — it is not an
          eligibility determination. Disclosure and consent flags are surfaced for human review;
          approvals and escalations are recorded in the audit trail with the acting admin&apos;s
          identity.
        </p>
      </Card>
    </div>
  )
}
