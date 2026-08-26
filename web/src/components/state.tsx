export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      className="flex items-center justify-center gap-3 rounded-xl border border-zinc-200 bg-white p-10 text-sm text-zinc-500"
      role="status"
    >
      <span
        className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600"
        aria-hidden
      />
      {label}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 p-10 text-center">
      <p className="text-sm font-medium text-red-700">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
      <p className="text-sm font-semibold text-zinc-700">{title}</p>
      <p className="max-w-sm text-sm text-zinc-500">{description}</p>
    </div>
  )
}
