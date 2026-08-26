import { describe, expect, it } from 'vitest'
import { dbStatusFromUi, formatValueBand, mapDeal, mapOpportunity } from '../mappers'

const opportunityRow = {
  id: 'opp_1',
  title: 'Fall Hydration Campaign Ambassador',
  brandName: 'Apex Nutrition',
  payout: 3500,
  sport: 'Basketball',
  location: 'National',
  deadline: '2026-09-15',
  status: 'OPEN' as const,
  description: 'Promote the lineup.',
  ownerUserId: 'user_1',
  organizationId: null,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  updatedAt: new Date('2026-08-01T00:00:00Z'),
}

const dealRow = {
  id: 'deal_1',
  title: 'Apex Electrolyte Launch',
  brandName: 'Apex Nutrition',
  athleteName: 'Jordan Carter',
  amount: 3500,
  status: 'PENDING' as const,
  stage: 'negotiation',
  deliverables: 3,
  startDate: '2026-08-01',
  endDate: '2026-09-30',
  ownerUserId: 'user_1',
  organizationId: null,
  createdAt: new Date('2026-08-01T00:00:00Z'),
  updatedAt: new Date('2026-08-02T00:00:00Z'),
}

describe('mapOpportunity', () => {
  it('maps DB columns to the widget contract', () => {
    const mapped = mapOpportunity(opportunityRow)
    expect(mapped.brand).toBe('Apex Nutrition')
    expect(mapped.valueBand).toBe('$3,500')
    expect(mapped.status).toBe('new')
    expect(mapped.summary).toBe('Promote the lineup.')
    expect(mapped.receivedAt).toBe('2026-08-01T00:00:00.000Z')
  })

  it('falls back to new for unknown statuses', () => {
    expect(mapOpportunity({ ...opportunityRow, status: 'WHATEVER' as never }).status).toBe('new')
  })
})

describe('mapDeal', () => {
  it('maps DB columns to the widget contract', () => {
    const mapped = mapDeal(dealRow)
    expect(mapped.athlete).toBe('Jordan Carter')
    expect(mapped.brand).toBe('Apex Nutrition')
    expect(mapped.stage).toBe('negotiation')
    expect(mapped.valueBand).toBe('$3,500')
    expect(mapped.hasTask).toBe(true)
  })

  it('marks non-pending deals as having no task', () => {
    expect(mapDeal({ ...dealRow, status: 'ACTIVE' }).hasTask).toBe(false)
  })
})

describe('status round-trip', () => {
  it('maps UI statuses to DB statuses and back', () => {
    expect(dbStatusFromUi('new')).toBe('OPEN')
    expect(dbStatusFromUi('under_review')).toBe('APPLIED')
    expect(dbStatusFromUi('accepted')).toBe('ACCEPTED')
    expect(dbStatusFromUi('declined')).toBe('CLOSED')
  })
})

describe('formatValueBand', () => {
  it('formats amounts as dollars', () => {
    expect(formatValueBand(1800)).toBe('$1,800')
    expect(formatValueBand(0)).toBe('$0')
  })
})
