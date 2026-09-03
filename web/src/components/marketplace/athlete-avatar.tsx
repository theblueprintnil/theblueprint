import { cn } from '@/lib/cn'
import { initialsFor } from '@/lib/marketplace/athletes'

export function AthleteAvatar({
  name,
  hue,
  className,
}: {
  name: string
  hue: number
  className?: string
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center font-display font-extrabold text-white',
        className ?? 'h-12 w-12 rounded-full text-base',
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 72% 55%), hsl(${hue + 45} 76% 40%))`,
      }}
    >
      {initialsFor(name)}
    </div>
  )
}
