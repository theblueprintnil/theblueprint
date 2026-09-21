import type { Metadata } from 'next'
import Link from 'next/link'

import { CtaBand } from '@/components/brand/CtaBand'
import { PageHero } from '@/components/brand/PageHero'

export const metadata: Metadata = {
  title: 'For Brands',
  description:
    'Discover verified athletes, run compliant NIL campaigns, and manage deals from brief to disclosure on The Blueprint.',
}

const FEATURES = [
  {
    title: 'Verified athlete directory',
    body: 'Search by sport, school, audience size, and brand interests. Every profile carries verification status so you know who you are talking to.',
  },
  {
    title: 'Campaign brief builder',
    body: 'Stand up a campaign in minutes: deliverables, timeline, budget, and compliance tags — all captured before outreach begins.',
  },
  {
    title: 'Deal workspace',
    body: 'Message athletes, review contracts, track milestones, and approve deliverables in one audited workspace per deal.',
  },
  {
    title: 'Compliance guardrails',
    body: 'Disclosure reminders, state and school rule context, and a full audit trail keep every engagement review-ready.',
  },
  {
    title: 'Performance tracking',
    body: 'See deliverable status, content performance, and spend across campaigns in one dashboard.',
  },
  {
    title: 'Centralized billing',
    body: 'Track budgets and payout schedules per deal and campaign without spreadsheets.',
  },
]

const PROCESS = [
  ['Discover', 'Filter the directory by sport, school, audience, and verified interests.'],
  ['Brief', 'Define deliverables, timeline, and budget with the campaign builder.'],
  ['Deal', 'Negotiate, contract, and disclose in an audited deal workspace.'],
  ['Measure', 'Track deliverables and performance from your campaign dashboard.'],
]

export default function BrandsPage() {
  return (
    <div>
      <PageHero
        eyebrow="Brand & Sponsor Onboarding"
        title={
          <>
            Find athletes worth
            <br />
            <span className="brand-gradient-text">every deal.</span>
          </>
        }
        description="A curated, verified athlete marketplace with campaign tooling and compliance guardrails — so you can run NIL programs with confidence, not guesswork."
      >
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-full brand-gradient px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,127,255,0.35)] transition hover:opacity-90"
        >
          Start your trial
        </Link>
        <Link
          href="/athletes"
          className="inline-flex items-center justify-center rounded-full border border-border bg-white px-7 py-3.5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
        >
          Browse athletes
        </Link>
      </PageHero>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="card-hover-lift rounded-2xl border border-border bg-white p-7"
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-tint text-brand">
                <svg
                  viewBox="0 0 20 20"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden
                >
                  <rect x="3" y="3" width="14" height="14" rx="3.5" />
                  <path d="M7 10l2.2 2.2L13.5 7.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-white/60">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-brand">
                How it works
              </span>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
                From discovery to disclosure
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Every step is captured so your compliance team can review the entire lifecycle of a
                partnership in one place.
              </p>
            </div>
            <ol className="grid content-center gap-2.5">
              {PROCESS.map(([title, body], index) => (
                <li
                  key={title}
                  className="flex items-center gap-4 rounded-xl border border-border bg-white px-4 py-3"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-tint font-display text-sm font-bold text-brand">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-display text-sm font-bold text-ink">{title}</p>
                    <p className="text-sm text-muted-foreground">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-brand">
              Built for your team
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
              Legal, marketing, and finance on the same page
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Grant your team role-based access: campaign managers run briefs, legal reviews
              contracts and disclosures, finance tracks budgets, and leadership sees the full
              pipeline — each with an audit trail.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-7">
            <h3 className="font-display text-lg font-bold text-ink">Roles you can assign</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              <li className="flex justify-between gap-4">
                <span>Owner</span>
                <span className="font-semibold text-ink">Full control</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Campaign manager</span>
                <span className="font-semibold text-ink">Briefs & outreach</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Legal / compliance</span>
                <span className="font-semibold text-ink">Contracts & disclosures</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Finance</span>
                <span className="font-semibold text-ink">Budgets & payouts</span>
              </li>
              <li className="flex justify-between gap-4">
                <span>Viewer</span>
                <span className="font-semibold text-ink">Read-only</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <CtaBand />
    </div>
  )
}
