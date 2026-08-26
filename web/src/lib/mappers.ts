import type { Deal as DbDeal, Opportunity as DbOpportunity } from '@prisma/client'
import type { Deal, Opportunity, OpportunityStatus } from './types'

const uiStatusByDb: Record<string, OpportunityStatus> = {
  OPEN: 'new',
  APPLIED: 'under_review',
  ACCEPTED: 'accepted',
  CLOSED: 'declined',
}

const dbStatusByUi: Record<OpportunityStatus, string> = {
  new: 'OPEN',
  under_review: 'APPLIED',
  accepted: 'ACCEPTED',
  declined: 'CLOSED',
}

export function dbStatusFromUi(status: OpportunityStatus): string {
  return dbStatusByUi[status]
}

export function formatValueBand(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`
}

export function mapOpportunity(row: DbOpportunity): Opportunity {
  return {
    id: row.id,
    brand: row.brandName,
    title: row.title,
    valueBand: formatValueBand(row.payout),
    status: uiStatusByDb[row.status] ?? 'new',
    receivedAt: row.createdAt.toISOString(),
    summary: row.description,
  }
}

export function mapDeal(row: DbDeal): Deal {
  return {
    id: row.id,
    athlete: row.athleteName,
    brand: row.brandName,
    title: row.title,
    stage: row.stage as Deal['stage'],
    valueBand: formatValueBand(row.amount),
    updatedAt: row.updatedAt.toISOString(),
    hasTask: row.status === 'PENDING',
  }
}
