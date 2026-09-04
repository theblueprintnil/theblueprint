import type { Prisma } from '@prisma/client'

import { prismaAuth } from '../db'
import { getMembershipRole } from '../organizations'
import type { AgentExecutionView, BriefInput, CaptionVariant, ComplianceFlag } from './types'

export type AgentExecutionRow = Prisma.AgentTaskExecutionGetPayload<{
  include: { athlete: { select: { name: true; sport: true; school: true } } }
}>

function asJson<T>(value: unknown): T {
  return value as T
}

export function toAgentExecutionView(row: AgentExecutionRow): AgentExecutionView {
  return {
    id: row.id,
    threadId: row.threadId,
    status: row.status,
    complianceScore: row.complianceScore,
    complianceFlags: asJson<ComplianceFlag[] | null>(row.complianceFlags) ?? [],
    captions: asJson<CaptionVariant[] | null>(row.captions) ?? [],
    inputRef: asJson<BriefInput | null>(row.inputRef) ?? null,
    reviewerFeedback: row.reviewerFeedback,
    publishedPostUrl: row.publishedPostUrl,
    createdAt: row.createdAt.toISOString(),
    athlete: {
      name: row.athlete.name,
      sport: row.athlete.sport,
      school: row.athlete.school,
    },
  }
}

export async function listPendingApprovals(
  userId: string,
  organizationId: string,
): Promise<AgentExecutionView[]> {
  const role = await getMembershipRole(userId, organizationId)
  if (!role) return []
  const rows = await prismaAuth.agentTaskExecution.findMany({
    where: { organizationId, status: 'PENDING_APPROVAL' },
    include: { athlete: { select: { name: true, sport: true, school: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return rows.map(toAgentExecutionView)
}
