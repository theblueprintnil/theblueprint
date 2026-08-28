/**
 * Public surface of the AI service layer.
 *
 * Import from `@/lib/ai` — never from internal modules. Server-only.
 */

export type { AiActionContext, AiActionResult, RunAiActionOptions } from './orchestrator'
export { runAiAction, estimateCost } from './orchestrator'
export { AiError, toSafeError, type AiErrorCode, type SafeAiError } from './errors'
export type {
  AiProvider,
  ProviderMessage,
  ProviderRequest,
  ProviderResponse,
  ProviderErrorCode,
} from './provider'
export { ProviderError, parseJsonResponse } from './provider'
export {
  getActiveProvider,
  getActiveProviderKey,
  listAvailableProviders,
} from './providers/registry'
export {
  summarizeOpportunity,
  generateMediaKitBio,
  reviewDeal,
  opportunitySummarySchema,
  mediaKitBioSchema,
  dealReviewSchema,
} from './actions'
export type {
  DealReviewInput,
  DealReviewOutput,
  MediaKitBioInput,
  MediaKitBioOutput,
  OpportunitySummaryInput,
  OpportunitySummaryOutput,
} from './actions'
export {
  registerPromptTemplate,
  getPromptTemplate,
  listPromptTemplates,
  type PromptTemplate,
} from './prompts/registry'
export { sanitizeInput, sanitizeInputObject, registerRedactor, clearRedactors } from './redaction'
export { getRateLimiter, InMemoryRateLimiter, type RateLimiter, type RateLimitDecision } from './rate-limit'

// Side-effect: register built-in prompt templates.
import './prompts/templates'
