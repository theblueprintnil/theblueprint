import { DEAL_STAGES, type Deal, type DealStage } from './types'

export function stageLabel(stage: DealStage): string {
  switch (stage) {
    case 'athlete_review':
      return 'Athlete review'
    case 'contract_review':
      return 'Contract review'
    default:
      return stage.replace(/_/g, ' ')
  }
}

export function nextStage(stage: DealStage): DealStage | null {
  const index = DEAL_STAGES.indexOf(stage)
  if (index < 0 || index >= DEAL_STAGES.length - 1) return null
  return DEAL_STAGES[index + 1]
}

export function countByStage(deals: Deal[]): Record<DealStage, number> {
  const counts = Object.fromEntries(DEAL_STAGES.map((stage) => [stage, 0])) as Record<
    DealStage,
    number
  >
  for (const deal of deals) counts[deal.stage] += 1
  return counts
}

export function sortDeals(deals: Deal[]): Deal[] {
  return [...deals].sort((a, b) => {
    const stageDiff = DEAL_STAGES.indexOf(a.stage) - DEAL_STAGES.indexOf(b.stage)
    if (stageDiff !== 0) return stageDiff
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}
