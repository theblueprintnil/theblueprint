/**
 * Feature-specific AI actions.
 *
 * These are the only public entry points feature code should call. Each action
 * wires a prompt template + Zod output schema to the orchestrator, so route
 * handlers and server actions never touch the provider or prompt internals.
 *
 * Server-only.
 */

import { z } from 'zod'
import { runAiAction, type AiActionContext, type AiActionResult } from './orchestrator'
import {
  dealReviewTemplate,
  mediaKitBioTemplate,
  opportunitySummaryTemplate,
  type DealReviewInput,
  type DealReviewOutput,
  type MediaKitBioInput,
  type MediaKitBioOutput,
  type OpportunitySummaryInput,
  type OpportunitySummaryOutput,
} from './prompts/templates'

// ---------------------------------------------------------------------------
// Zod output schemas (the source of truth for structured outputs)
// ---------------------------------------------------------------------------
export const opportunitySummarySchema = z.object({
  summary: z.string().min(1),
  fitScore: z.number().min(0).max(100),
  redFlags: z.array(z.string()),
  suggestedResponse: z.string().min(1),
})

export const mediaKitBioSchema = z.object({
  headline: z.string().min(1),
  bio: z.string().min(1),
  tags: z.array(z.string()),
})

export const dealReviewSchema = z.object({
  riskLevel: z.enum(['low', 'medium', 'high']),
  issues: z.array(z.string()),
  recommendations: z.array(z.string()),
  complianceNotes: z.array(z.string()),
})

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
export function summarizeOpportunity(
  context: AiActionContext,
  input: OpportunitySummaryInput,
): Promise<AiActionResult<OpportunitySummaryOutput>> {
  return runAiAction<OpportunitySummaryInput, OpportunitySummaryOutput>({
    context,
    featureKey: opportunitySummaryTemplate.featureKey,
    input,
    outputSchema: opportunitySummarySchema,
  })
}

export function generateMediaKitBio(
  context: AiActionContext,
  input: MediaKitBioInput,
): Promise<AiActionResult<MediaKitBioOutput>> {
  return runAiAction<MediaKitBioInput, MediaKitBioOutput>({
    context,
    featureKey: mediaKitBioTemplate.featureKey,
    input,
    outputSchema: mediaKitBioSchema,
  })
}

export function reviewDeal(
  context: AiActionContext,
  input: DealReviewInput,
  options: { policySnapshotId?: string } = {},
): Promise<AiActionResult<DealReviewOutput>> {
  return runAiAction<DealReviewInput, DealReviewOutput>({
    context,
    featureKey: dealReviewTemplate.featureKey,
    input,
    outputSchema: dealReviewSchema,
    policySnapshotId: options.policySnapshotId,
    // dealReviewTemplate.highRisk is true; forceReview is redundant but explicit.
    forceReview: true,
  })
}

// Re-export the input/output types for callers.
export type {
  DealReviewInput,
  DealReviewOutput,
  MediaKitBioInput,
  MediaKitBioOutput,
  OpportunitySummaryInput,
  OpportunitySummaryOutput,
}
