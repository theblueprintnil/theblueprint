'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

import { AthleteAvatar } from '@/components/marketplace/athlete-avatar'
import { MARKET_ATHLETES } from '@/lib/marketplace/athletes'

const SPORTS = [
  'All Sports',
  'Basketball',
  'Soccer',
  'Football',
  'Tennis',
  'Baseball',
  'Track & Field',
]

export default function AthletesDirectoryPage() {
  const [query, setQuery] = useState('')
  const [sport, setSport] = useState('All Sports')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return MARKET_ATHLETES.filter((athlete) => {
      const matchesSport = sport === 'All Sports' || athlete.sport === sport
      const matchesQuery =
        q === '' ||
        athlete.name.toLowerCase().includes(q) ||
        athlete.school.toLowerCase().includes(q) ||
        athlete.sport.toLowerCase().includes(q) ||
        athlete.location.toLowerCase().includes(q)
      return matchesSport && matchesQuery
    })
  }, [query, sport])

  return (
    <div className="hero-gradient">
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-tint px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          Athlete marketplace
        </span>
        <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
          Discover verified athlete brands
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          Search by sport, school, or interest. Every profile shows verification status, real
          audience numbers, and the media kit the athlete controls.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 20 20"
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              aria-hidden
            >
              <circle cx="9" cy="9" r="5.5" />
              <path d="M13.5 13.5L17 17" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name, school, sport, or city…"
              aria-label="Search athletes"
              className="w-full rounded-full border border-border bg-white py-3 pl-11 pr-4 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <select
            value={sport}
            onChange={(event) => setSport(event.target.value)}
            aria-label="Filter by sport"
            className="rounded-full border border-border bg-white px-5 py-3 text-sm font-medium text-ink outline-none transition focus:border-brand"
          >
            {SPORTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <p className="text-sm text-muted-foreground">
          {filtered.length} athlete{filtered.length === 1 ? '' : 's'} found
        </p>
        {filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-white/70 p-16 text-center">
            <h2 className="font-display text-lg font-bold text-ink">
              No athletes match your search
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different sport or clear the search query.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((athlete) => (
              <article
                key={athlete.username}
                className="card-hover-lift flex flex-col rounded-2xl border border-border bg-white p-6"
              >
                <div className="flex items-start gap-4">
                  <AthleteAvatar
                    name={athlete.name}
                    hue={athlete.avatarHue}
                    className="h-14 w-14 rounded-2xl text-lg"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-display text-lg font-bold text-ink">
                        {athlete.name}
                      </h2>
                      {athlete.verificationStatus === 'verified' ? (
                        <span
                          className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-brand text-white"
                          title="Verified"
                        >
                          <svg
                            viewBox="0 0 12 12"
                            className="h-2.5 w-2.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            aria-hidden
                          >
                            <path
                              d="M2.5 6.5l2.3 2.3 4.7-5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {athlete.sport} · {athlete.school}
                    </p>
                  </div>
                </div>
                <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                  {athlete.bio}
                </p>
                <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border/70 pt-4 text-center">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Followers
                    </dt>
                    <dd className="mt-0.5 font-display text-sm font-extrabold text-ink">
                      {athlete.followers}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Engagement
                    </dt>
                    <dd className="mt-0.5 font-display text-sm font-extrabold text-ink">
                      {athlete.engagementRate}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Location
                    </dt>
                    <dd className="mt-0.5 truncate text-sm font-semibold text-ink">
                      {athlete.location.split(',')[0]}
                    </dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {athlete.brandInterests.slice(0, 3).map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full bg-brand-tint px-2.5 py-1 text-[11px] font-semibold text-brand"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/athletes/${athlete.username}`}
                  className="mt-6 inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-brand/40 hover:text-brand"
                >
                  View media kit
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
