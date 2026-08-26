import type { Opportunity, OpportunityStatus } from './types'

export function filterByStatus(
  opportunities: Opportunity[],
  status?: OpportunityStatus | 'all',
): Opportunity[] {
  if (!status || status === 'all') return opportunities
  return opportunities.filter((opportunity) => opportunity.status === status)
}

export function sortByRecency(opportunities: Opportunity[]): Opportunity[] {
  return [...opportunities].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  )
}
