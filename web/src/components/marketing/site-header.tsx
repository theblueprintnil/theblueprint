import Link from 'next/link'

import { Logo } from '@/components/brand/Logo'

const NAV_LINKS = [
  { href: '/about', label: 'About' },
  { href: '/athletes', label: 'Athletes' },
  { href: '/brands', label: 'For Brands' },
  { href: '/nil-compliance', label: 'NIL Compliance' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-6">
        <Link href="/" aria-label="The Blueprint home">
          <Logo size="sm" />
        </Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-brand-tint hover:text-brand"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-sm font-semibold text-ink transition hover:text-brand sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center rounded-full brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(0,127,255,0.32)] transition hover:opacity-90"
          >
            Start your trial
          </Link>
        </div>
      </div>
    </header>
  )
}
