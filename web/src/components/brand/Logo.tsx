import { cn } from '@/lib/cn'

type LogoProps = {
  className?: string
  tone?: 'dark' | 'light'
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: {
    mark: 'h-8 w-8 rounded-lg',
    glyph: 'text-base',
    tick: 'w-3.5',
    wordmark: 'text-lg',
    cap: 'text-[9px]',
  },
  md: {
    mark: 'h-10 w-10 rounded-xl',
    glyph: 'text-xl',
    tick: 'w-4',
    wordmark: 'text-2xl',
    cap: 'text-[10px]',
  },
  lg: {
    mark: 'h-14 w-14 rounded-2xl',
    glyph: 'text-3xl',
    tick: 'w-5',
    wordmark: 'text-4xl',
    cap: 'text-xs',
  },
} as const

export function Logo({ className, tone = 'dark', size = 'md' }: LogoProps) {
  const s = SIZES[size]
  const wordColor = tone === 'light' ? 'text-white' : 'text-ink'
  const capColor = tone === 'light' ? 'text-cyan' : 'text-brand'
  const shadowClass = tone === 'light' ? 'logo-3d-light' : 'logo-3d'
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <span
        aria-hidden
        className={cn(
          'relative grid shrink-0 place-items-center overflow-hidden brand-gradient',
          s.mark,
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_6px_18px_rgba(0,127,255,0.35)]',
        )}
      >
        <svg viewBox="0 0 24 24" className={cn('relative z-10 h-1/2 w-1/2 text-white')} fill="currentColor" aria-hidden>
          <path d="M6 2h7.2a4.8 4.8 0 1 1 0 9.6H9.6v4.4H6.6V2h-.6zm3 3v3.6h3a1.8 1.8 0 1 0 0-3.6H9z" />
          <rect x="3.4" y="18.2" width="17.2" height="3.4" rx="1.1" />
        </svg>
        <span className={cn('absolute bottom-1 left-1/2 h-[2px] -translate-x-1/2 rounded-full bg-cyan', s.tick)} />
      </span>
      <span className="flex flex-col leading-none">
        <span className={cn('font-display font-extrabold tracking-tight', s.wordmark, wordColor, shadowClass)}>
          The Blueprint
        </span>
        <span className={cn('mt-0.5 font-body font-semibold uppercase tracking-[0.28em]', s.cap, capColor)}>
          NIL Operating System
        </span>
      </span>
    </span>
  )
}
