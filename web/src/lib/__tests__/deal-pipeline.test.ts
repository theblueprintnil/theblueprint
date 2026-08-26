import { describe, expect, it } from 'vitest'
import { countByStage, nextStage, sortDeals, stageLabel } from '../deal-pipeline'
import { DEAL_STAGES, type Deal } from '../types'

const sampleDeals: Deal[] = [
  {
    id: 'a',
    athlete: 'A',
    brand: 'B',
    title: 'T',
    stage: 'received',
    valueBand: '$1',
    updatedAt: '2026-08-15T00:00:00Z',
    hasTask: false,
  },
  {
    id: 'b',
    athlete: 'A',
    brand: 'B',
    title: 'T',
    stage: 'signed',
    valueBand: '$1',
    updatedAt: '2026-08-10T00:00:00Z',
    hasTask: false,
  },
  {
    id: 'c',
    athlete: 'A',
    brand: 'B',
    title: 'T',
    stage: 'received',
    valueBand: '$1',
    updatedAt: '2026-08-12T00:00:00Z',
    hasTask: false,
  },
]

describe('stageLabel', () => {
  it('renders snake_case stages as readable labels', () => {
    expect(stageLabel('athlete_review')).toBe('Athlete review')
    expect(stageLabel('contract_review')).toBe('Contract review')
  })

  it('keeps single-word stages as-is', () => {
    expect(stageLabel('received')).toBe('received')
    expect(stageLabel('signed')).toBe('signed')
  })
})

describe('nextStage', () => {
  it('returns the next stage in order', () => {
    expect(nextStage('received')).toBe('qualified')
    expect(nextStage('approval')).toBe('signed')
  })

  it('returns null for the final stage', () => {
    expect(nextStage('closed')).toBeNull()
  })
})

describe('countByStage', () => {
  it('counts deals per stage with zero defaults', () => {
    const counts = countByStage(sampleDeals)
    expect(counts.received).toBe(2)
    expect(counts.signed).toBe(1)
    expect(counts.negotiation).toBe(0)
    for (const stage of DEAL_STAGES) {
      expect(counts[stage]).toBeTypeOf('number')
    }
  })
})

describe('sortDeals', () => {
  it('orders by stage position, then by recency', () => {
    const sorted = sortDeals(sampleDeals)
    expect(sorted.map((deal) => deal.id)).toEqual(['a', 'c', 'b'])
  })
})
