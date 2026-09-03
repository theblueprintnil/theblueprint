import type { Metadata } from 'next'
import Link from 'next/link'

import { Card, PageHeader } from '@/components/dashboard/dashboard-ui'

export const metadata: Metadata = {
  title: 'New campaign',
}

const DELIVERABLE_OPTIONS = [
  'Instagram post',
  'Instagram story pack',
  'TikTok video',
  'YouTube short',
  'Photo shoot (1 day)',
  'Appearance / event',
]

export default function NewCampaignPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Create a campaign"
        description="Define the brief once — outreach, deals, and deliverables stay attached."
      >
        <Link
          href="/dashboard/brand"
          className="inline-flex items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
        >
          Cancel
        </Link>
      </PageHeader>

      <div className="space-y-6">
        <Card title="Campaign basics">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Campaign name">
              <input placeholder="e.g. Fall Hydration Ambassador" className={INPUT} />
            </Field>
            <Field label="Objective">
              <select defaultValue="awareness" className={INPUT}>
                <option value="awareness">Brand awareness</option>
                <option value="launch">Product launch</option>
                <option value="content">Content acquisition</option>
                <option value="local">Local engagement</option>
              </select>
            </Field>
            <Field label="Description">
              <textarea rows={4} placeholder="What are you asking athletes to do and why?" className={`${INPUT} resize-none sm:col-span-2`} />
            </Field>
          </div>
        </Card>

        <Card title="Budget & timeline">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Total budget">
              <input type="number" placeholder="8000" className={INPUT} />
            </Field>
            <Field label="Start date">
              <input type="date" defaultValue="2026-09-01" className={INPUT} />
            </Field>
            <Field label="End date">
              <input type="date" defaultValue="2026-09-30" className={INPUT} />
            </Field>
          </div>
        </Card>
        <Card title="Deliverables">
          <div className="grid gap-2 sm:grid-cols-2">
            {DELIVERABLE_OPTIONS.map((option, index) => (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 transition has-[:checked]:border-brand has-[:checked]:bg-brand-tint"
              >
                <input
                  type="checkbox"
                  name="deliverables"
                  value={option}
                  defaultChecked={index < 3}
                  className="h-4 w-4 accent-[#007fff]"
                />
                <span className="text-sm font-medium text-ink">{option}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card title="Compliance & disclosure">
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ['Disclosure required', 'Athletes must tag the campaign per platform rules'],
              ['Guardian consent', 'Required when contracting with minor athletes'],
              ['State rule check', 'Flag state-specific disclosure requirements'],
              ['Exclusive category', 'Block competitors within this campaign'],
            ].map(([title, note], index) => (
              <label
                key={title}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 transition has-[:checked]:border-brand has-[:checked]:bg-brand-tint"
              >
                <input
                  type="checkbox"
                  name="compliance"
                  defaultChecked={index < 2}
                  className="mt-0.5 h-4 w-4 accent-[#007fff]"
                />
                <span>
                  <span className="block text-sm font-medium text-ink">{title}</span>
                  <span className="block text-xs text-muted-foreground">{note}</span>
                </span>
              </label>
            ))}
          </div>
        </Card>

        <Card title="Athlete targeting">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sport">
              <select defaultValue="any" className={INPUT}>
                <option value="any">Any sport</option>
                <option>Basketball</option>
                <option>Football</option>
                <option>Soccer</option>
                <option>Baseball</option>
                <option>Track & Field</option>
                <option>Tennis</option>
              </select>
            </Field>
            <Field label="Location">
              <input placeholder="Any location" className={INPUT} />
            </Field>
            <Field label="Minimum followers">
              <input type="number" placeholder="10000" className={INPUT} />
            </Field>
            <Field label="School (optional)">
              <input placeholder="e.g. State University" className={INPUT} />
            </Field>
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            className="rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
          >
            Save draft
          </button>
          <Link
            href="/dashboard/brand"
            className="inline-flex items-center justify-center rounded-full brand-gradient px-6 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,127,255,0.32)] transition hover:opacity-90"
          >
            Create campaign
          </Link>
        </div>
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

const INPUT =
  'w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-white'
