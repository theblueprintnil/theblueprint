'use server'

import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { randomUUID } from 'node:crypto'

import { getEntitlementSnapshot, type EntitlementSnapshot } from '@/lib/billing/entitlements'
import { prismaAuth, withOrgContext } from '@/lib/db'
import { getMembershipRole, resolveActiveOrganization } from '@/lib/organizations'
import { atLeast, can } from '@/lib/permissions'
import { getSessionUser } from '@/lib/session'

import { dispatchCancelTask, dispatchResume, dispatchStart } from './celery-client'
import { resolveAgeTier } from './tier'
import type { AgentActionState, ApprovalDecision, BriefInput } from './types'

interface ReviewInput {
  executionId: string
  feedback?: string | null
}

interface StartInput {
  athleteId: string
  brief: Omit<BriefInput, 'athleteId' | 'tenantId'>
}

async function requireAuthorizedUser() {
  const user = await getSessionUser()
  if (!user) throw new Error('You must be signed in.')
  const store = await cookies()
  const org = await resolveActiveOrganization(
    user.id,
    store.get('blueprint_org')?.value ?? user.currentOrganizationId,
  )
  if (!org) throw new Error('No active organization. Finish onboarding first.')
  return { user, org }
}

function hasStudioModule(snapshot: EntitlementSnapshot): boolean {
  const modules = snapshot.modules as string[] | Record<string, boolean> | null
  if (!modules) return false
  if (Array.isArray(modules)) return modules.includes('studio')
  return modules['studio'] === true
}

async function requireStudioEntitlement(organizationId: string): Promise<void> {
  const snapshot = await getEntitlementSnapshot(organizationId)
  if (!snapshot || !hasStudioModule(snapshot)) {
    throw new Error('Content studio is not enabled on your plan.')
  }
}

async function recordReviewDecision(
  input: ReviewInput,
  decision: ApprovalDecision,
): Promise<AgentActionState> {
  try {
    const { user, org } = await requireAuthorizedUser()
    const role = await getMembershipRole(user.id, org.id)
    if (!role || !atLeast(role, 'ADMIN')) {
      return { ok: false, error: 'Only owners and admins can approve or revise content.' }
    }
    await requireStudioEntitlement(org.id)

    const execution = await prismaAuth.agentTaskExecution.findFirst({
      where: { id: input.executionId, organizationId: org.id },
      select: { id: true, threadId: true, status: true },
    })
    if (!execution) {
      return { ok: false, error: 'Execution was not found in this organization.' }
    }
    if (execution.status !== 'PENDING_APPROVAL') {
      return { ok: false, error: 'This execution is not awaiting approval.' }
    }

    const reviewerFeedback = (input.feedback ?? '').trim() || null
    const status = decision === 'APPROVED' ? 'APPROVED' : 'REVISION_REQUESTED'
    const action =
      decision === 'APPROVED' ? 'AGENT_EXECUTION_APPROVED' : 'AGENT_EXECUTION_REVISION_REQUESTED'

    await withOrgContext(user.id, org.id, async (tx) => {
      const updated = await tx.agentTaskExecution.updateMany({
        where: { id: execution.id, organizationId: org.id, status: 'PENDING_APPROVAL' },
        data: { status, reviewerId: user.id, reviewerFeedback },
      })
      if (updated.count !== 1) {
        throw new Error('This execution is no longer awaiting approval.')
      }
      await tx.auditLog.create({
        data: {
          action,
          entityType: 'AgentTaskExecution',
          entityId: execution.id,
          actorId: user.id,
          organizationId: org.id,
          details: JSON.stringify({
            threadId: execution.threadId,
            reviewerId: user.id,
            reviewerFeedback,
          }),
        },
      })
    })

    try {
      await dispatchResume({
        organizationId: org.id,
        executionId: execution.id,
        threadId: execution.threadId,
        decision,
        reviewerId: user.id,
        feedback: reviewerFeedback,
      })
    } catch (dispatchError) {
      await withOrgContext(user.id, org.id, async (tx) => {
        await tx.agentTaskExecution.updateMany({
          where: { id: execution.id, organizationId: org.id, status },
          data: { status: 'PENDING_APPROVAL', reviewerId: null, reviewerFeedback: null },
        })
        await tx.auditLog.create({
          data: {
            action: 'AGENT_EXECUTION_RESUME_FAILED',
            entityType: 'AgentTaskExecution',
            entityId: execution.id,
            actorId: user.id,
            organizationId: org.id,
            details: JSON.stringify({ threadId: execution.threadId }),
          },
        })
      })
      const message =
        dispatchError instanceof Error ? dispatchError.message : 'Resume dispatch failed.'
      return {
        ok: false,
        error: `Decision recorded but the agent queue could not be reached: ${message}`,
      }
    }

    revalidatePath('/app/studio')
    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unexpected error.' }
  }
}

export async function approveAgentExecution(input: ReviewInput): Promise<AgentActionState> {
  return recordReviewDecision(input, 'APPROVED')
}

export async function requestAgentRevision(input: ReviewInput): Promise<AgentActionState> {
  return recordReviewDecision(input, 'REVISION_REQUESTED')
}

export async function startAgentGeneration(input: StartInput): Promise<AgentActionState> {
  try {
    const { user, org } = await requireAuthorizedUser()
    const role = await getMembershipRole(user.id, org.id)
    if (!role) return { ok: false, error: 'You are not a member of this organization.' }
    if (!can(role, 'manage_content')) {
      return { ok: false, error: 'Your role cannot create agent content.' }
    }
    await requireStudioEntitlement(org.id)

    const athlete = await prismaAuth.athlete.findUnique({
      where: { id: input.athleteId },
      select: { id: true, userId: true, dateOfBirth: true },
    })
    if (!athlete) return { ok: false, error: 'Athlete profile was not found.' }
    const athleteMembership = await getMembershipRole(athlete.userId, org.id)
    if (!athleteMembership) {
      return { ok: false, error: 'Athlete is not part of this organization.' }
    }

    const threadId = `nil-${org.id}-${randomUUID()}`
    const a2aTaskId = `a2a-${randomUUID()}`
    const brief: BriefInput = { ...input.brief, tenantId: org.id, athleteId: athlete.id }
    const ageTier = resolveAgeTier(athlete.dateOfBirth)

    const executionId = await withOrgContext(user.id, org.id, async (tx) => {
      const created = await tx.agentTaskExecution.create({
        data: {
          organizationId: org.id,
          athleteId: athlete.id,
          graphKind: 'NIL_GENERATION',
          threadId,
          status: 'QUEUED',
          inputRef: brief as unknown as Prisma.InputJsonValue,
          a2aTaskId,
          ageTier,
          policySnapshotId: brief.policySnapshotId,
          depth: 0,
        },
        select: { id: true },
      })
      await tx.auditLog.create({
        data: {
          action: 'AGENT_EXECUTION_QUEUED',
          entityType: 'AgentTaskExecution',
          entityId: created.id,
          actorId: user.id,
          organizationId: org.id,
          details: JSON.stringify({
            threadId,
            athleteId: athlete.id,
            campaignTitle: input.brief.campaignTitle,
          }),
        },
      })
      return created.id
    })

    try {
      await dispatchStart({
        organizationId: org.id,
        executionId,
        threadId,
        brief: brief as unknown as Record<string, unknown>,
      })
    } catch (dispatchError) {
      await withOrgContext(user.id, org.id, async (tx) => {
        await tx.agentTaskExecution.updateMany({
          where: { id: executionId, organizationId: org.id },
          data: { status: 'FAILED', errorMessage: 'Agent dispatch failed.' },
        })
        await tx.auditLog.create({
          data: {
            action: 'AGENT_EXECUTION_QUEUE_FAILED',
            entityType: 'AgentTaskExecution',
            entityId: executionId,
            actorId: user.id,
            organizationId: org.id,
            details: JSON.stringify({ threadId }),
          },
        })
      })
      const message =
        dispatchError instanceof Error ? dispatchError.message : 'Agent dispatch failed.'
      return { ok: false, error: `Execution queued but not dispatched: ${message}` }
    }

    revalidatePath('/app/studio')
    return { ok: true, executionId }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unexpected error.' }
  }
}

interface CancelInput {
  executionId: string
  reason?: string | null
}

export async function cancelAgentExecution(input: CancelInput): Promise<AgentActionState> {
  try {
    const { user, org } = await requireAuthorizedUser()
    const role = await getMembershipRole(user.id, org.id)
    if (!role || !atLeast(role, 'ADMIN')) {
      return { ok: false, error: 'Only owners and admins can cancel agent tasks.' }
    }

    const execution = await prismaAuth.agentTaskExecution.findFirst({
      where: { id: input.executionId, organizationId: org.id },
      select: { id: true, status: true },
    })
    if (!execution) {
      return { ok: false, error: 'Execution was not found in this organization.' }
    }
    const terminal = ['PUBLISHED', 'FAILED', 'CANCELLED', 'EXPIRED']
    if (terminal.includes(execution.status)) {
      return { ok: false, error: 'This execution is already in a terminal state.' }
    }

    await dispatchCancelTask({
      organizationId: org.id,
      executionId: execution.id,
      reason: (input.reason ?? '').trim() || undefined,
    })

    await withOrgContext(user.id, org.id, async (tx) => {
      await tx.auditLog.create({
        data: {
          action: 'AGENT_EXECUTION_CANCEL_REQUESTED',
          entityType: 'AgentTaskExecution',
          entityId: execution.id,
          actorId: user.id,
          organizationId: org.id,
          details: JSON.stringify({ requestedBy: user.id }),
        },
      })
    })

    revalidatePath('/app/studio')
    return { ok: true, executionId: execution.id }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unexpected error.' }
  }
}
