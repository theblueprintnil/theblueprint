/**
 * Prompt template registry.
 *
 * Every AI feature renders its prompt from a versioned template registered
 * here. The orchestrator records `promptTemplateVersion` on each `ai_runs`
 * row so any output can be traced back to the exact prompt that produced it.
 *
 * Templates are pure functions: input -> messages. They never call the
 * provider and never touch the database.
 *
 * Server-only.
 */

import type { ProviderMessage } from '../provider'

export interface PromptTemplate<TInput> {
  /** Stable feature key, e.g. "opportunity.summary". */
  readonly featureKey: string
  /** Semver-ish version of this prompt's wording. Bump when wording changes. */
  readonly version: string
  /** Default model to use when the caller does not specify one. */
  readonly defaultModel: string
  /** Default temperature. */
  readonly defaultTemperature?: number
  /** Default max output tokens. */
  readonly defaultMaxOutputTokens?: number
  /** When true, outputs are flagged for human review by default. */
  readonly highRisk?: boolean
  /** Render the provider messages for a given input. */
  render(input: TInput): ProviderMessage[]
}

const REGISTRY = new Map<string, PromptTemplate<unknown>>()

export function registerPromptTemplate<TInput>(template: PromptTemplate<TInput>): void {
  const key = template.featureKey
  if (REGISTRY.has(key)) {
    // Re-registration with the same version is a no-op; a different version is
    // a programming error caught at startup, not at runtime.
    const existing = REGISTRY.get(key)!
    if (existing.version === template.version) return
    throw new Error(
      `Prompt template "${key}" already registered with version ${existing.version} (got ${template.version}).`,
    )
  }
  REGISTRY.set(key, template as PromptTemplate<unknown>)
}

export function getPromptTemplate(featureKey: string): PromptTemplate<unknown> {
  const template = REGISTRY.get(featureKey)
  if (!template) {
    throw new Error(`No prompt template registered for feature "${featureKey}".`)
  }
  return template
}

export function listPromptTemplates(): Array<{ featureKey: string; version: string }> {
  return Array.from(REGISTRY.values()).map((t) => ({ featureKey: t.featureKey, version: t.version }))
}

/**
 * Render a template and return both the messages and the template metadata,
 * so the orchestrator can persist the version alongside the run.
 */
export function renderPrompt<TInput>(
  featureKey: string,
  input: TInput,
): { template: PromptTemplate<TInput>; messages: ProviderMessage[] } {
  const template = getPromptTemplate(featureKey) as PromptTemplate<TInput>
  return { template, messages: template.render(input) }
}
