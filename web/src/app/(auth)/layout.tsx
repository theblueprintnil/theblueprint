'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { Logo } from '@/components/brand/Logo'

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isSignup = pathname.startsWith('/signup')
  const linkHref = isSignup ? '/login' : '/signup'
  const linkLabel = isSignup ? 'Already have an account?' : 'New here? Start your trial'

  return (
    <div className="hero-gradient flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" aria-label="The Blueprint home">
          <Logo size="sm" />
        </Link>
        <Link
          href={linkHref}
          className="rounded-full px-4 py-2 text-sm font-semibold text-ink transition hover:text-brand"
        >
          {linkLabel}
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md rounded-3xl border border-border bg-white p-8 shadow-[0_24px_70px_rgba(0,60,140,0.14)]">
          {children}
        </div>
      </main>
    </div>
  )
}
