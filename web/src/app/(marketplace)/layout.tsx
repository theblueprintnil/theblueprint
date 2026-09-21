import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'

export const metadata: Metadata = {
  title: {
    default: 'Athlete Marketplace — The Blueprint',
    template: '%s — The Blueprint',
  },
}

export default function MarketplaceLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
