import Link from 'next/link'

import { CtaBand } from '@/components/brand/CtaBand'

const AUDIENCE_CARDS = [
  {
    eyebrow: 'For Athletes',
    title: 'Build a brand sponsors can verify',
    body: 'A verified profile and shareable media kit with real audience numbers. Get discovered by brands looking for fit, not just follower counts.',
    href: '/athletes',
    cta: 'Browse the directory',
  },
  {
    eyebrow: 'For Brands',
    title: 'Run compliant campaigns end-to-end',
    body: 'Discover athletes, brief a campaign, negotiate a deal, and manage deliverables — with disclosure and compliance guardrails built in.',
    href: '/brands',
    cta: 'Partner with athletes',
  },
]

const HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Create your profile',
    body: 'Athletes publish a verified brand profile and media kit. Brands set up a workspace with a campaign budget.',
  },
  {
    step: '2',
    title: 'Discover and connect',
    body: 'Brands search the athlete directory by sport, school, audience, and interests. Athletes review inquiries in their inbox.',
  },
  {
    step: '3',
    title: 'Deal, disclose, deliver',
    body: 'Negotiate terms, manage contracts and deliverables, and keep every disclosure audit-ready from one workspace.',
  },
]

export default function HomePage() {
  return (
    <div className="hero-gradient">
      <Hero />
      <StatsBand />
      <TwoSided />
      <HowItWorks />
      <ComplianceBand />
      <CtaBand />
    </div>
  )
}

function Hero() {
  return (
    <section className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-20 lg:grid-cols-2 lg:items-center lg:pt-28">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-tint px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Two-sided NIL operating platform
        </span>
        <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl">
          Build your NIL brand.
          <br />
          Manage your NIL <span className="brand-gradient-text">business.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          One platform where athletes publish verified brands, brands discover
          the right partners, and every deal moves from brief to disclosure with
          compliance guardrails intact.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full brand-gradient px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,127,255,0.35)] transition hover:opacity-90"
          >
            Start your free trial
          </Link>
          <Link
            href="/athletes"
            className="inline-flex items-center justify-center rounded-full border border-border bg-white px-7 py-3.5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
          >
            Browse athletes
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          7-day trial · credit card required · cancel anytime
        </p>
      </div>
      <div className="relative lg:pl-6">
        <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-white/70 p-2 shadow-[0_30px_80px_rgba(0,60,140,0.18)] backdrop-blur">
          <div className="rounded-2xl bg-white p-6">
            <div className="flex items-center justify-between">
              <span className="font-display text-sm font-bold text-ink">Deal pipeline</span>
              <span className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-semibold text-brand">
                Compliance ready
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ['Received', 'Apex Nutrition · Electrolyte Launch'],
                ['Qualified', 'Fit check + disclosure review'],
                ['Athlete review', 'Jordan Carter · Terms viewed'],
                ['Contract review', 'Version 3 · Guardian approved'],
                ['Signed', 'Audit trail recorded'],
              ].map(([stage, detail]) => (
                <div key={stage} className="flex items-center gap-3 rounded-xl border border-border/70 bg-white p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-tint font-display text-xs font-bold text-brand">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                      <path d="M3.5 8.5l3 3 6-6.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{stage}</p>
                    <p className="truncate text-xs text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="glass-card absolute -bottom-6 -left-4 hidden rounded-2xl px-5 py-4 sm:block">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Media kit views</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-ink">142 <span className="text-sm font-semibold text-brand">+18%</span></p>
        </div>
      </div>
    </section>
  )
}

function StatsBand() {
  return (
    <section className="border-y border-border/70 bg-white/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Verified athletes', '2,400+'],
          ['Active brands', '180+'],
          ['Deals managed', '$8.2M'],
          ['Compliance checks', '100%'],
        ].map(([label, value]) => (
          <div key={label} className="text-center lg:text-left">
            <p className="font-display text-3xl font-extrabold tracking-tight text-brand">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function TwoSided() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid gap-6 lg:grid-cols-2">
        {AUDIENCE_CARDS.map((card) => (
          <div key={card.eyebrow} className="card-hover-lift flex flex-col rounded-3xl border border-border bg-white p-8">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-brand">{card.eyebrow}</span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">{card.title}</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{card.body}</p>
            <Link
              href={card.href}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:gap-3"
            >
              {card.cta}
              <span aria-hidden>→</span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section className="border-y border-border/70 bg-white/60">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <h2 className="text-center font-display text-3xl font-bold tracking-tight text-ink">
          Up and running in minutes
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full brand-gradient font-display text-lg font-extrabold text-white">
                {item.step}
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ComplianceBand() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="brand-gradient-soft rounded-3xl border border-brand/15 p-8 sm:p-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-brand">Compliance framework</span>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
              Disclosure is a workflow, not an afterthought
            </h2>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">
              Every deal carries disclosure checkpoints, verification status, and
              an audit trail. We help you stay organized — we never make
              eligibility determinations for you.
            </p>
            <Link
              href="/nil-compliance"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:gap-3"
            >
              Read the compliance guidelines
              <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="space-y-3">
            {[
              ['Verification', 'School, sport, and eligibility context on every profile'],
              ['Disclosure', 'Required-tag workflows per deal and platform'],
              ['Guardrails', 'State, school, and conference rule reminders'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-border bg-white p-5">
                <h3 className="font-display text-sm font-bold text-ink">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
