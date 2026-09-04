import { randomUUID } from 'node:crypto'

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

interface RpcEnvelope {
  jsonrpc: '2.0'
  id: string
  method: 'agent.run' | 'agent.resume'
  params: Record<string, unknown>
}

interface RpcPayload {
  error?: { message?: string }
  result?: { taskId?: string }
}

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL
const AGENT_SERVICE_TOKEN = process.env.AGENT_SERVICE_TOKEN

function gatewayBase(): string {
  if (!AGENT_SERVICE_URL) {
    throw new Error('AGENT_SERVICE_URL is not configured. See web/.env.example.')
  }
  return AGENT_SERVICE_URL.replace(/\/+$/, '')
}

function bearerToken(): string {
  if (!AGENT_SERVICE_TOKEN) {
    throw new Error('AGENT_SERVICE_TOKEN is not configured. See web/.env.example.')
  }
  return `Bearer ${AGENT_SERVICE_TOKEN}`
}

async function postRpc(
  path: '/agent/run' | '/agent/resume',
  method: RpcEnvelope['method'],
  params: Record<string, unknown>,
  timeoutMs = 10_000,
): Promise<{ taskId: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const envelope: RpcEnvelope = { jsonrpc: '2.0', id: randomUUID(), method, params }
    const response = await fetch(`${gatewayBase()}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: bearerToken() },
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
    if (!payload.result?.taskId) {
      throw new Error('Agent gateway returned no task id.')
    }
    return { taskId: payload.result.taskId }
  } finally {
    clearTimeout(timer)
  }
}

export async function dispatchResume(input: ResumeDispatch): Promise<{ taskId: string }> {
  return postRpc('/agent/resume', 'agent.resume', {
    organizationId: input.organizationId,
    executionId: input.executionId,
    threadId: input.threadId,
    review: {
      decision: input.decision,
      reviewerId: input.reviewerId,
      feedback: input.feedback ?? null,
    },
  })
}

export async function dispatchStart(input: StartDispatch): Promise<{ taskId: string }> {
  return postRpc('/agent/run', 'agent.run', {
    organizationId: input.organizationId,
    executionId: input.executionId,
    threadId: input.threadId,
    brief: input.brief,
  })
}
