import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AthleteAvatar } from '@/components/marketplace/athlete-avatar'
import { getMarketAthleteByUsername } from '@/lib/marketplace/athletes'

type AthleteProfilePageProps = {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: AthleteProfilePageProps): Promise<Metadata> {
  const { username } = await params
  const athlete = getMarketAthleteByUsername(username)
  if (!athlete) return { title: 'Athlete not found' }
  return {
    title: `${athlete.name} — Media Kit`,
    description: athlete.headline,
  }
}

export default async function AthleteProfilePage({ params }: AthleteProfilePageProps) {
  const { username } = await params
  const athlete = getMarketAthleteByUsername(username)
  if (!athlete) notFound()

  return (
    <div>
      <section className="hero-gradient border-b border-border/70">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <Link href="/athletes" className="inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:gap-3">
            <span aria-hidden>←</span>
            Back to directory
          </Link>
          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <AthleteAvatar name={athlete.name} hue={athlete.avatarHue} className="h-24 w-24 rounded-3xl text-3xl" />
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
                    {athlete.name}
                  </h1>
                  {athlete.verificationStatus === 'verified' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
                        <path d="M2.5 6.5l2.3 2.3 4.7-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Verified
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                      Verification pending
                    </span>
                  )}
                </div>
                <p className="mt-2 text-lg font-medium text-ink">
                  {athlete.position} · {athlete.sport}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {athlete.school} · {athlete.classYear} · {athlete.location}
                </p>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">{athlete.headline}</p>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-4">
              <div className="stat-card text-center">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Followers</dt>
                <dd className="mt-1 font-display text-2xl font-extrabold text-ink">{athlete.followers}</dd>
              </div>
              <div className="stat-card text-center">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Engagement</dt>
                <dd className="mt-1 font-display text-2xl font-extrabold text-ink">{athlete.engagementRate}</dd>
              </div>
              <div className="stat-card text-center">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Kit views</dt>
                <dd className="mt-1 font-display text-2xl font-extrabold text-ink">{athlete.mediaKitViews}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-brand">Audience snapshot</span>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {athlete.stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-border bg-white p-5 text-center">
                  <p className="font-display text-2xl font-extrabold text-brand">{stat.value}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>

            <span className="mt-12 block text-xs font-bold uppercase tracking-[0.22em] text-brand">About</span>
            <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground">{athlete.bio}</p>

            <div className="mt-12 grid grid-cols-3 gap-4">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-border bg-white/60"
                >
                  <span className="text-xs font-medium text-muted-foreground">Content</span>
                </div>
              ))}
            </div>

            <span className="mt-12 block text-xs font-bold uppercase tracking-[0.22em] text-brand">Brand interests</span>
            <div className="mt-4 flex flex-wrap gap-2">
              {athlete.brandInterests.map((interest) => (
                <span key={interest} className="rounded-full bg-brand-tint px-3.5 py-1.5 text-sm font-semibold text-brand">
                  {interest}
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <MediaInquiry athleteName={athlete.name} />
            <SponsorCard sponsors={athlete.sponsors} />
            <ComplianceNote />
          </div>
        </div>
      </section>
    </div>
  )
}

function MediaInquiry({ athleteName }: { athleteName: string }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <h2 className="font-display text-lg font-bold text-ink">Media & booking inquiry</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        For press, partnerships, or booking requests regarding {athleteName}.
      </p>
      <form className="mt-5 space-y-4">
        <div>
          <label htmlFor="inquiry-name" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your name
          </label>
          <input
            id="inquiry-name"
            type="text"
            required
            className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-white"
          />
        </div>
        <div>
          <label htmlFor="inquiry-email" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Email address
          </label>
          <input
            id="inquiry-email"
            type="email"
            required
            className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-white"
          />
        </div>
        <div>
          <label htmlFor="inquiry-org" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Organization
          </label>
          <input
            id="inquiry-org"
            type="text"
            className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-white"
          />
        </div>
        <div>
          <label htmlFor="inquiry-message" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Message
          </label>
          <textarea
            id="inquiry-message"
            required
            rows={4}
            className="w-full resize-none rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand focus:bg-white"
          />
        </div>
        <button
          type="button"
          className="w-full rounded-xl brand-gradient px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(0,127,255,0.3)] transition hover:opacity-90"
        >
          Send inquiry
        </button>
      </form>
    </section>
  )
}

function SponsorCard({ sponsors }: { sponsors: string[] }) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6">
      <h2 className="font-display text-lg font-bold text-ink">Partners</h2>
      {sponsors.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No public partnerships yet.</p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {sponsors.map((sponsor) => (
            <span key={sponsor} className="rounded-full border border-border bg-muted/40 px-3.5 py-1.5 text-sm font-semibold text-ink">
              {sponsor}
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

function ComplianceNote() {
  return (
    <section className="rounded-2xl border border-brand/15 bg-brand-tint/60 p-6">
      <h2 className="font-display text-sm font-bold text-ink">Compliance note</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        Verification indicates identity steps completed on the platform. It is
        not a determination that any specific NIL activity is permissible.
        Confirm school, conference, and state rules before contracting.
      </p>
    </section>
  )
}
