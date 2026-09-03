import type { Metadata } from 'next'
import Link from 'next/link'

import { Card, PageHeader } from '@/components/dashboard/dashboard-ui'

export const metadata: Metadata = {
  title: 'Profile & media kit',
}

const INTERESTS = [
  'Fitness & Nutrition',
  'Sports Apparel',
  'Tech & Gadgets',
  'Local Business',
  'Wellness',
  'Food & Beverage',
  'Gaming',
  'Education',
]

export default function AthleteProfileEditPage() {
  return (
    <div>
      <PageHeader
        title="Profile & media kit"
        description="Build the brand package sponsors see when they discover you."
      >
        <Link
          href="/athletes/jordan-carter"
          className="inline-flex items-center justify-center rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
        >
          View public media kit
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Basic information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input defaultValue="Jordan Carter" className={INPUT} />
              </Field>
              <Field label="Position">
                <input defaultValue="Point Guard" className={INPUT} />
              </Field>
              <Field label="Sport">
                <input defaultValue="Basketball" className={INPUT} />
              </Field>
              <Field label="School">
                <input defaultValue="State University" className={INPUT} />
              </Field>
              <Field label="Class year">
                <select defaultValue="Junior" className={INPUT}>
                  {['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'].map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Location">
                <input defaultValue="Columbus, OH" className={INPUT} />
              </Field>
            </div>
          </Card>

          <Card title="Bio & headline">
            <div className="space-y-4">
              <Field label="Headline">
                <input
                  defaultValue="Point guard · Fitness & tech storyteller · Community builder"
                  className={INPUT}
                />
              </Field>
              <Field label="Bio">
                <textarea
                  rows={5}
                  defaultValue="State University point guard averaging 16.4 PPG. I document the training grind, game-day routines, and the business behind college athletics."
                  className={`${INPUT} resize-none`}
                />
              </Field>
            </div>
          </Card>

          <Card title="Social links">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Instagram">
                <input defaultValue="https://instagram.com/jordancarter" className={INPUT} />
              </Field>
              <Field label="TikTok">
                <input defaultValue="https://tiktok.com/@jordancarter" className={INPUT} />
              </Field>
              <Field label="YouTube">
                <input defaultValue="https://youtube.com/@jordancarter" className={INPUT} />
              </Field>
              <Field label="X / Twitter">
                <input defaultValue="https://x.com/jordancarter" className={INPUT} />
              </Field>
            </div>
          </Card>

          <Card title="Brand interests">
            <p className="text-sm text-muted-foreground">
              Select the partnership categories you want brands to see on your profile.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {INTERESTS.map((interest, index) => (
                <label
                  key={interest}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3 transition has-[:checked]:border-brand has-[:checked]:bg-brand-tint"
                >
                  <input
                    type="checkbox"
                    name="interests"
                    value={interest}
                    defaultChecked={index < 4}
                    className="h-4 w-4 accent-[#007fff]"
                  />
                  <span className="text-sm font-medium text-ink">{interest}</span>
                </label>
              ))}
            </div>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
            >
              Save draft
            </button>
            <button
              type="button"
              className="rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,127,255,0.32)] transition hover:opacity-90"
            >
              Publish media kit
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <Card title="Media kit preview">
            <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand font-display text-xl font-extrabold text-white">
                JC
              </span>
              <p className="mt-3 font-display text-lg font-bold text-ink">Jordan Carter</p>
              <p className="text-sm text-muted-foreground">Point Guard · State University</p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Your public media kit updates automatically when you publish. Brands see your
                stats, interests, and verified badge.
              </p>
            </div>
          </Card>

          <Card title="Profile strength">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Completion</span>
                  <span className="font-semibold text-ink">85%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-[85%] rounded-full brand-gradient" />
                </div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckIcon /> Social links connected
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> Portfolio assets added
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon /> Brand interests selected
                </li>
                <li className="flex items-center gap-2 text-amber-600">
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-amber-100 text-[10px] font-bold">!</span>
                  Add 2–3 content samples to reach 100%
                </li>
              </ul>
            </div>
          </Card>
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

function CheckIcon() {
  return (
    <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand-tint text-brand">
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
        <path d="M2.5 6.5l2.3 2.3 4.7-5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

const INPUT =
  'w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-white'
