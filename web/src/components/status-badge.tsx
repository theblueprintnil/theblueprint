import { stageLabel } from '@/lib/deal-pipeline'
import type { DealStage, OpportunityStatus } from '@/lib/types'

const opportunityStyles: Record<OpportunityStatus, string> = {
  new: 'border-blue-200 bg-blue-50 text-blue-700',
  under_review: 'border-amber-200 bg-amber-50 text-amber-700',
  accepted: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  declined: 'border-zinc-200 bg-zinc-100 text-zinc-600',
}

const dealStyles: Record<DealStage, string> = {
  received: 'border-zinc-200 bg-zinc-100 text-zinc-600',
  qualified: 'border-blue-200 bg-blue-50 text-blue-700',
  athlete_review: 'border-violet-200 bg-violet-50 text-violet-700',
  negotiation: 'border-amber-200 bg-amber-50 text-amber-700',
  contract_review: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  approval: 'border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700',
  signed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  fulfilled: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  closed: 'border-zinc-200 bg-zinc-100 text-zinc-500',
}

export function OpportunityBadge({ status }: { status: OpportunityStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${opportunityStyles[status]}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}

export function DealStageBadge({ stage }: { stage: DealStage }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${dealStyles[stage]}`}
    >
      {stageLabel(stage)}
    </span>
  )
}
