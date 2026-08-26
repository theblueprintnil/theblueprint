import { EmptyState } from './state'

export function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
      <EmptyState title="Scoped for a later slice" description={description} />
    </div>
  )
}
