'use client'

import useSWR from 'swr'
import { DEAL_STAGES, type Deal } from '@/lib/types'
import { stageLabel } from '@/lib/deal-pipeline'
import { EmptyState, ErrorState, LoadingState } from './state'
import { cn } from '@/lib/cn'

async function fetcher(url: string): Promise<{ items: Deal[] }> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return (await response.json()) as { items: Deal[] }
}

export function DealPipeline() {
  const { data, error, isLoading, mutate } = useSWR('/api/deals', fetcher)
  const items = data?.items ?? []
  const errorMessage = error instanceof Error ? error.message : 'Something went wrong'

  if (error) {
    return <ErrorState message={errorMessage} onRetry={() => void mutate()} />
  }
  if (isLoading) {
    return <LoadingState label="Loading pipeline…" />
  }
  if (items.length === 0) {
    return (
      <EmptyState
        title="No deals yet"
        description="Opportunities you qualify will move through this pipeline."
      />
    )
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Deal pipeline</h2>
          <p className="text-sm text-zinc-500">{items.length} active deals</p>
        </div>
        <a
          href="/app/agency/deals"
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Open pipeline
        </a>
      </div>
      <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
        {DEAL_STAGES.map((stage) => {
          const stageItems = items.filter((deal) => deal.stage === stage)
          return (
            <div key={stage} className="w-56 shrink-0">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {stageLabel(stage)}
                </p>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    stageItems.length > 0 ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-500',
                  )}
                >
                  {stageItems.length}
                </span>
              </div>
              <div className="space-y-2">
                {stageItems.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 p-3 text-center text-xs text-zinc-400">
                    Empty
                  </div>
                ) : (
                  stageItems.map((deal) => (
                    <div key={deal.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                      <p className="text-sm font-medium text-zinc-900">{deal.title}</p>
                      <p className="mt-0.5 text-xs text-zinc-500">
                        {deal.athlete} · {deal.brand}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-700">{deal.valueBand}</span>
                        {deal.hasTask ? <span className="text-amber-600">task due</span> : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
