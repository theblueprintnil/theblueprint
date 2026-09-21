import { randomUUID } from 'node:crypto'

import { mintAgentJwt } from './agent-jwt'
import type { ApprovalDecision } from './types'

export interface ResumeDispatch {
  organizationId: string
  executionId: string
  threadId: string
  decision: ApprovalDecision
  reviewerId: string
  feedback?: string | null
}

export interface StartDispatch {
  organizationId: string
  executionId: string
  threadId: string
  brief: Record<string, unknown>
}

export interface TaskDispatch {
  organizationId: string
  executionId?: string
  a2aTaskId?: string
  reason?: string
}

interface RpcEnvelope {
  jsonrpc: '2.0'
  id: string
  method: 'agent.run' | 'agent.resume' | 'task.get' | 'task.cancel'
  params: Record<string, unknown>
}

interface RpcPayload {
  error?: { message?: string }
  result?: { taskId?: string } & Record<string, unknown>
}

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL

function gatewayBase(): string {
  if (!AGENT_SERVICE_URL) {
    throw new Error('AGENT_SERVICE_URL is not configured. See web/.env.example.')
  }
  return AGENT_SERVICE_URL.replace(/\/+$/, '')
}

function bearerToken(organizationId: string): string {
  return `Bearer ${mintAgentJwt({ organizationId })}`
}

async function postRpc(
  path: '/agent/run' | '/agent/resume' | '/agent/task',
  method: RpcEnvelope['method'],
  params: Record<string, unknown>,
  organizationId: string,
  timeoutMs = 10_000,
): Promise<{ taskId?: string } & Record<string, unknown>> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const envelope: RpcEnvelope = { jsonrpc: '2.0', id: randomUUID(), method, params }
    const response = await fetch(`${gatewayBase()}${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: bearerToken(organizationId),
      },
      body: JSON.stringify(envelope),
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Agent gateway responded with HTTP ${response.status}.`)
    }
    const payload = (await response.json()) as RpcPayload
    if (payload.error?.message) {
      throw new Error(payload.error.message)
    }
    if (!payload.result) {
      throw new Error('Agent gateway returned no result.')
    }
    return payload.result
  } finally {
    clearTimeout(timer)
  }
}

export async function dispatchResume(input: ResumeDispatch): Promise<{ taskId: string }> {
  const result = await postRpc(
    '/agent/resume',
    'agent.resume',
    {
      organizationId: input.organizationId,
      executionId: input.executionId,
      threadId: input.threadId,
      review: {
        decision: input.decision,
        reviewerId: input.reviewerId,
        feedback: input.feedback ?? null,
      },
    },
    input.organizationId,
  )
  if (!result.taskId) {
    throw new Error('Agent gateway returned no task id.')
  }
  return { taskId: result.taskId as string }
}

export async function dispatchStart(input: StartDispatch): Promise<{ taskId: string }> {
  const result = await postRpc(
    '/agent/run',
    'agent.run',
    {
      organizationId: input.organizationId,
      executionId: input.executionId,
      threadId: input.threadId,
      brief: input.brief,
    },
    input.organizationId,
  )
  if (!result.taskId) {
    throw new Error('Agent gateway returned no task id.')
  }
  return { taskId: result.taskId as string }
}

export async function dispatchGetTask(input: TaskDispatch): Promise<Record<string, unknown>> {
  if (Boolean(input.executionId) === Boolean(input.a2aTaskId)) {
    throw new Error('Provide exactly one of executionId or a2aTaskId.')
  }
  return postRpc(
    '/agent/task',
    'task.get',
    {
      organizationId: input.organizationId,
      executionId: input.executionId ?? null,
      a2aTaskId: input.a2aTaskId ?? null,
    },
    input.organizationId,
  )
}

export async function dispatchCancelTask(input: TaskDispatch): Promise<Record<string, unknown>> {
  if (Boolean(input.executionId) === Boolean(input.a2aTaskId)) {
    throw new Error('Provide exactly one of executionId or a2aTaskId.')
  }
  return postRpc(
    '/agent/task',
    'task.cancel',
    {
      organizationId: input.organizationId,
      executionId: input.executionId ?? null,
      a2aTaskId: input.a2aTaskId ?? null,
      reason: input.reason ?? null,
    },
    input.organizationId,
  )
}
