'use client'

import useSWR from 'swr'
import { useState } from 'react'
import type { Opportunity } from '@/lib/types'
import { filterByStatus, sortByRecency } from '@/lib/opportunities'
import { OpportunityBadge } from './status-badge'
import { EmptyState, ErrorState, LoadingState } from './state'
import { cn } from '@/lib/cn'

type StatusFilter = 'all' | 'new' | 'under_review' | 'accepted' | 'declined'

const filters: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'under_review', label: 'Under review' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'declined', label: 'Declined' },
]

async function fetcher(url: string): Promise<{ items: Opportunity[] }> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return (await response.json()) as { items: Opportunity[] }
}

export function OpportunityInbox() {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const { data, error, isLoading, mutate } = useSWR('/api/opportunities', fetcher)
  const items = data?.items ?? []
  const visible = sortByRecency(filterByStatus(items, filter))
  const errorMessage = error instanceof Error ? error.message : 'Something went wrong'

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Opportunity inbox</h2>
          <p className="text-sm text-zinc-500">New brand opportunities waiting for your call.</p>
        </div>
        <a
          href="/app/opportunities"
          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          View all
        </a>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setFilter(option.id)}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              filter === option.id
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50',
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {error ? (
          <ErrorState message={errorMessage} onRetry={() => void mutate()} />
        ) : isLoading ? (
          <LoadingState label="Loading opportunities…" />
        ) : visible.length === 0 ? (
          <EmptyState
            title={
              filter === 'all'
                ? 'No opportunities yet'
                : `No ${filter.replace(/_/g, ' ')} opportunities`
            }
            description="When brands send you offers, they will show up here."
          />
        ) : (
          <ul className="divide-y divide-zinc-100">
            {visible.map((opportunity) => (
              <li key={opportunity.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-900">{opportunity.title}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {opportunity.brand} · {new Date(opportunity.receivedAt).toLocaleDateString()}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{opportunity.summary}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs font-medium text-zinc-700">{opportunity.valueBand}</span>
                  <OpportunityBadge status={opportunity.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
