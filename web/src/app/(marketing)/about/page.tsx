import type { Metadata } from 'next'
import Link from 'next/link'

import { CtaBand } from '@/components/brand/CtaBand'
import { PageHero } from '@/components/brand/PageHero'

export const metadata: Metadata = {
  title: 'About',
  description:
    'The mission, story, and compliance framework behind The Blueprint NIL operating platform.',
}

const VALUES = [
  {
    title: 'Athlete-first',
    body: 'Athletes own their brand. We give them the tools to build it and the controls to keep it safe.',
  },
  {
    title: 'Compliance-native',
    body: 'Disclosure, verification, and audit trails are features, not add-ons we bolt on later.',
  },
  {
    title: 'Trust through transparency',
    body: 'Every deal has a record. Every approval has an author. Nothing moves in silence.',
  },
  {
    title: 'Security by default',
    body: 'Tenant isolation, least-privilege access, and private storage protect every contract and minor.',
  },
]

const PILLARS = [
  {
    title: 'Verification',
    body: 'Profiles surface school, sport, and eligibility context so sponsors can assess fit without guessing.',
  },
  {
    title: 'Disclosure',
    body: 'Required-tag workflows and platform-disclosure reminders are built into every deal lifecycle.',
  },
  {
    title: 'Guardrails',
    body: 'State, conference, and school rule reminders plus guardian consent for minors keep decisions human and documented.',
  },
]

export default function AboutPage() {
  return (
    <div>
      <PageHero
        eyebrow="About The Blueprint"
        title={
          <>
            The operating system for
            <br />
            <span className="brand-gradient-text">athlete brands and brand deals.</span>
          </>
        }
        description="The Blueprint connects athletes who build verified personal brands with brands that run compliant NIL campaigns — on one platform with clear roles, consent, and audit trails."
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
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-brand">Our mission</span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
              Make NIL sustainable for athletes and reliable for brands
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              NIL created an opportunity, but most athletes were handed a profile
              page and left to figure the business out alone. Brands, meanwhile,
              faced a fragmented, trust-starved marketplace.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              The Blueprint exists to change that. Athletes get a verified brand
              package, a media kit they control, and a transparent deal workflow.
              Brands get a curated directory, campaign tooling, and compliance
              guardrails that make every engagement audit-ready.
            </p>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              We are an operating platform, not a legal advisor. Every compliance
              determination stays with qualified professionals — we make the
              workflow, the record-keeping, and the disclosure reminders
              effortless.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-white p-7">
            <h3 className="font-display text-lg font-bold text-ink">Why athletes trust us</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-tint text-brand">
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                    <path d="M3.5 8.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                You control what sponsors see and when
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-tint text-brand">
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                    <path d="M3.5 8.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Every offer, approval, and contract is documented
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-tint text-brand">
                  <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
                    <path d="M3.5 8.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Guardians stay in the loop for minors
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-border/70 bg-white/60">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <h2 className="text-center font-display text-3xl font-bold tracking-tight text-ink">
            What we believe
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map((value) => (
              <div key={value.title} className="rounded-2xl border border-border bg-white p-7">
                <h3 className="font-display text-lg font-bold text-ink">{value.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <span className="text-xs font-bold uppercase tracking-[0.22em] text-brand">Compliance framework</span>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight text-ink">
          Three pillars keep every engagement honest
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <div key={pillar.title} className="card-hover-lift rounded-2xl border border-border bg-white p-7">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-tint font-display text-lg font-extrabold text-brand">
                {index + 1}
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">
          Read the full guidance on our{' '}
          <Link href="/nil-compliance" className="font-semibold text-brand hover:underline">
            NIL compliance page
          </Link>
          .
        </p>
      </section>

      <CtaBand />
    </div>
  )
}
