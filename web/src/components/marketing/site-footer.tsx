import Link from 'next/link'

import { Logo } from '@/components/brand/Logo'

const FOOTER_COLS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: 'Platform',
    links: [
      { href: '/athletes', label: 'Athlete Directory' },
      { href: '/brands', label: 'For Brands' },
      { href: '/about', label: 'About' },
    ],
  },
  {
    title: 'Trust',
    links: [
      { href: '/nil-compliance', label: 'NIL Compliance' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/terms', label: 'Terms of Service' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/signup', label: 'Start a Trial' },
      { href: '/login', label: 'Sign in' },
      { href: '/', label: 'Overview' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" aria-label="The Blueprint home">
            <Logo size="sm" />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            The two-sided NIL operating platform. Athletes build verified personal brands; brands
            run compliant campaigns — in one marketplace.
          </p>
        </div>
        {FOOTER_COLS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-ink">
              {col.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition hover:text-brand"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} The Blueprint. All rights reserved.</p>
          <p className="max-w-2xl">
            The Blueprint is an operating platform, not a legal advisor. NCAA, conference, and
            school compliance determinations require qualified professional review and remain human
            decisions.
          </p>
        </div>
      </div>
    </footer>
  )
}
