import type { AgentExecutionStatus } from '@prisma/client'

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type RiskType =
  'ftc_disclosure' | 'ncaa_eligibility' | 'brand_exclusivity' | 'state_law' | 'platform_policy'

export interface ComplianceFlag {
  riskType: RiskType
  severity: RiskSeverity
  flagMessage: string
  recommendedEdit: string
}

export interface CaptionVariant {
  id: string
  platform: string
  text: string
  hashtags: string[]
  selected?: boolean
}

export interface BriefInput {
  tenantId: string
  athleteId: string
  athleteName: string
  brand: string
  campaignTitle: string
  contentGoal: string
  sport?: string | null
  school?: string | null
  platforms: string[]
  exclusivityTerms: string[]
  policySnapshotId: string
  deliverablesCount?: number
  captionCount?: number
  inspiration?: string[]
}

export type ApprovalDecision = 'APPROVED' | 'REVISION_REQUESTED'

export interface AgentExecutionView {
  id: string
  threadId: string
  status: AgentExecutionStatus
  complianceScore: number | null
  complianceFlags: ComplianceFlag[]
  captions: CaptionVariant[]
  inputRef: BriefInput | null
  reviewerFeedback: string | null
  publishedPostUrl: string | null
  createdAt: string
  athlete: {
    name: string
    sport: string
    school: string
  }
}

export type AgentActionState =
  { ok: true; message?: string; executionId?: string } | { ok: false; error: string }
