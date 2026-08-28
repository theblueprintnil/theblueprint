/**
 * Built-in prompt templates for The Blueprint's NIL features.
 *
 * Each template is versioned. Bump the version whenever the wording changes —
 * the orchestrator records it on every `ai_runs` row for auditability.
 *
 * Server-only.
 */

import type { PromptTemplate } from './registry'
import { registerPromptTemplate } from './registry'

// ---------------------------------------------------------------------------
// Opportunity summary
// ---------------------------------------------------------------------------
export interface OpportunitySummaryInput {
  opportunityTitle: string
  brandName: string
  payout: number
  sport: string
  description: string
  deadline: string
}

export interface OpportunitySummaryOutput {
  summary: string
  fitScore: number
  redFlags: string[]
  suggestedResponse: string
}

export const opportunitySummaryTemplate: PromptTemplate<OpportunitySummaryInput> = {
  featureKey: 'opportunity.summary',
  version: '1.0.0',
  defaultModel: 'gpt-4o-mini',
  defaultTemperature: 0.3,
  defaultMaxOutputTokens: 600,
  render(input) {
    return [
      {
        role: 'system',
        content:
          'You are an NIL deal analyst. Summarize the opportunity for an athlete, score the fit 0-100, ' +
          'flag red flags, and draft a polite suggested response. Return ONLY JSON matching the schema.',
      },
      {
        role: 'user',
        content:
          `Opportunity: ${input.opportunityTitle}\n` +
          `Brand: ${input.brandName}\n` +
          `Payout: $${input.payout}\n` +
          `Sport: ${input.sport}\n` +
          `Deadline: ${input.deadline}\n` +
          `Description: ${input.description}`,
      },
    ]
  },
}

// ---------------------------------------------------------------------------
// Media-kit bio generator
// ---------------------------------------------------------------------------
export interface MediaKitBioInput {
  athleteName: string
  sport: string
  school: string
  followerCount: number
  bio: string
}

export interface MediaKitBioOutput {
  headline: string
  bio: string
  tags: string[]
}

export const mediaKitBioTemplate: PromptTemplate<MediaKitBioInput> = {
  featureKey: 'media-kit.bio',
  version: '1.0.0',
  defaultModel: 'gpt-4o-mini',
  defaultTemperature: 0.5,
  defaultMaxOutputTokens: 400,
  render(input) {
    return [
      {
        role: 'system',
        content:
          'You write athlete media-kit copy. Be factual, brand-safe, and avoid hype. Return ONLY JSON.',
      },
      {
        role: 'user',
        content:
          `Athlete: ${input.athleteName}\n` +
          `Sport: ${input.sport}\n` +
          `School: ${input.school}\n` +
          `Followers: ${input.followerCount}\n` +
          `Existing bio: ${input.bio}`,
      },
    ]
  },
}

// ---------------------------------------------------------------------------
// Deal terms reviewer (high-risk: human review required)
// ---------------------------------------------------------------------------
export interface DealReviewInput {
  dealTitle: string
  brandName: string
  athleteName: string
  amount: number
  deliverables: number
  startDate: string
  endDate: string
}

export interface DealReviewOutput {
  riskLevel: 'low' | 'medium' | 'high'
  issues: string[]
  recommendations: string[]
  complianceNotes: string[]
}

export const dealReviewTemplate: PromptTemplate<DealReviewInput> = {
  featureKey: 'deals.review',
  version: '1.0.0',
  defaultModel: 'gpt-4o',
  defaultTemperature: 0.2,
  defaultMaxOutputTokens: 800,
  highRisk: true,
  render(input) {
    return [
      {
        role: 'system',
        content:
          'You are an NIL compliance reviewer. Identify contractual risk, missing protections, and ' +
          'NCAA/state compliance concerns. Be conservative. Return ONLY JSON matching the schema.',
      },
      {
        role: 'user',
        content:
          `Deal: ${input.dealTitle}\n` +
          `Brand: ${input.brandName}\n` +
          `Athlete: ${input.athleteName}\n` +
          `Amount: $${input.amount}\n` +
          `Deliverables: ${input.deliverables}\n` +
          `Start: ${input.startDate}\n` +
          `End: ${input.endDate}`,
      },
    ]
  },
}

// Register all built-in templates on import.
registerPromptTemplate(opportunitySummaryTemplate)
registerPromptTemplate(mediaKitBioTemplate)
registerPromptTemplate(dealReviewTemplate)

export const BUILTIN_TEMPLATES = [
  opportunitySummaryTemplate,
  mediaKitBioTemplate,
  dealReviewTemplate,
]
