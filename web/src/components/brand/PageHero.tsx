import type { ReactNode } from 'react'

type PageHeroProps = {
  eyebrow: string
  title: ReactNode
  description: string
  children?: ReactNode
}

export function PageHero({ eyebrow, title, description, children }: PageHeroProps) {
  return (
    <section className="hero-gradient border-b border-border/70">
      <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand-tint px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          {eyebrow}
        </span>
        <h1 className="mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {description}
        </p>
        {children ? <div className="mt-8 flex flex-col gap-3 sm:flex-row">{children}</div> : null}
      </div>
    </section>
  )
}
