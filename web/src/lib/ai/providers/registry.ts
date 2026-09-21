/**
 * Provider registry.
 *
 * Resolves the active provider from `AI_PROVIDER` (defaulting to "mock") and
 * holds the set of registered providers. Feature code asks for a provider by
 * calling `getActiveProvider()` — it never imports a concrete adapter.
 *
 * Server-only.
 */

import type { AiProvider, ProviderRequest, ProviderResponse } from '../provider'
import { ProviderError } from '../provider'
import { mockProvider } from './mock'
import { openaiProvider } from './openai'
import { anthropicProvider } from './anthropic'

const REGISTRY: Record<string, AiProvider> = {
  [mockProvider.key]: mockProvider,
  [openaiProvider.key]: openaiProvider,
  [anthropicProvider.key]: anthropicProvider,
}

export function getProvider(key: string): AiProvider {
  const provider = REGISTRY[key]
  if (!provider) {
    throw new ProviderError('unknown', `Unknown AI provider "${key}".`)
  }
  return provider
}

export function getActiveProviderKey(
  env: Record<string, string | undefined> = process.env,
): string {
  const key = (env.AI_PROVIDER ?? 'mock').trim().toLowerCase()
  return key
}

export function getActiveProvider(
  env: Record<string, string | undefined> = process.env,
): AiProvider {
  return getProvider(getActiveProviderKey(env))
}

export function listAvailableProviders(): Array<{ key: string; label: string }> {
  return Object.values(REGISTRY).map((p) => ({ key: p.key, label: p.label }))
}

/**
 * Test-only seam: inject a custom provider (e.g. a stub that throws) without
 * touching env vars. Restored by calling `restoreProvider()`.
 */
let injectedProvider: AiProvider | null = null
export function __setProviderForTest(provider: AiProvider | null): void {
  injectedProvider = provider
}

export async function completeWithActiveProvider(
  request: ProviderRequest,
  env: Record<string, string | undefined> = process.env,
): Promise<ProviderResponse> {
  const provider = injectedProvider ?? getActiveProvider(env)
  return provider.complete(request)
}
