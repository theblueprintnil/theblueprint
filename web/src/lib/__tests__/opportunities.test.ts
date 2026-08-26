import { describe, expect, it } from 'vitest'
import { filterByStatus, sortByRecency } from '../opportunities'
import type { Opportunity } from '../types'

const sample: Opportunity[] = [
  {
    id: 'old',
    brand: 'B',
    title: 'T',
    valueBand: '$1',
    status: 'new',
    receivedAt: '2026-08-10T00:00:00Z',
    summary: 's',
  },
  {
    id: 'new',
    brand: 'B',
    title: 'T',
    valueBand: '$1',
    status: 'under_review',
    receivedAt: '2026-08-15T00:00:00Z',
    summary: 's',
  },
  {
    id: 'acc',
    brand: 'B',
    title: 'T',
    valueBand: '$1',
    status: 'accepted',
    receivedAt: '2026-08-12T00:00:00Z',
    summary: 's',
  },
]

describe('filterByStatus', () => {
  it('returns everything when no status is given', () => {
    expect(filterByStatus(sample)).toHaveLength(3)
    expect(filterByStatus(sample, 'all')).toHaveLength(3)
  })

  it('filters to a single status', () => {
    expect(filterByStatus(sample, 'accepted').map((item) => item.id)).toEqual(['acc'])
    expect(filterByStatus(sample, 'new').map((item) => item.id)).toEqual(['old'])
  })

  it('returns an empty list when nothing matches', () => {
    expect(filterByStatus(sample, 'declined')).toEqual([])
  })
})

describe('sortByRecency', () => {
  it('orders newest received first without mutating input', () => {
    const sorted = sortByRecency(sample)
    expect(sorted.map((item) => item.id)).toEqual(['new', 'acc', 'old'])
    expect(sample.map((item) => item.id)).toEqual(['old', 'new', 'acc'])
  })
})
