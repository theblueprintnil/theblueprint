import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'

export const metadata: Metadata = {
  title: {
    default: 'The Blueprint — NIL Operating Platform',
    template: '%s — The Blueprint',
  },
  description:
    'The Blueprint is the two-sided NIL operating platform: an athlete brand studio, a public marketplace, and a brand campaign workspace for compliant deals.',
}

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
