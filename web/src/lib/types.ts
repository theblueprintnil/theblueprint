export type OpportunityStatus = 'new' | 'under_review' | 'accepted' | 'declined'

export interface Opportunity {
  id: string
  brand: string
  title: string
  valueBand: string
  status: OpportunityStatus
  receivedAt: string
  summary: string
}

export const DEAL_STAGES = [
  'received',
  'qualified',
  'athlete_review',
  'negotiation',
  'contract_review',
  'approval',
  'signed',
  'fulfilled',
  'closed',
] as const

export type DealStage = (typeof DEAL_STAGES)[number]

export interface Deal {
  id: string
  athlete: string
  brand: string
  title: string
  stage: DealStage
  valueBand: string
  updatedAt: string
  hasTask: boolean
}
