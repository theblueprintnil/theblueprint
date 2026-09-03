import Link from 'next/link'

export function CtaBand() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <div className="brand-gradient relative overflow-hidden rounded-[2rem] px-8 py-16 text-center shadow-[0_30px_80px_rgba(0,87,192,0.4)]">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <h2 className="relative mx-auto max-w-2xl font-display text-4xl font-extrabold tracking-tight text-white">
          Your brand. Your deals. One operating system.
        </h2>
        <p className="relative mx-auto mt-4 max-w-xl text-sm text-white/80">
          Athletes build verified brands. Brands run compliant campaigns.
          Start your 7-day trial and see it come together.
        </p>
        <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-white px-7 py-3.5 text-sm font-bold text-brand shadow-[0_10px_30px_rgba(0,20,60,0.25)] transition hover:opacity-90"
          >
            Start your trial
          </Link>
          <Link
            href="/athletes"
            className="inline-flex items-center justify-center rounded-full border border-white/40 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Browse athletes
          </Link>
        </div>
      </div>
    </section>
  )
}
