/**
 * Mock AI provider.
 *
 * Used by default in development and in tests so the AI service layer can be
 * exercised end-to-end without a real API key or network call. The mock
 * returns deterministic JSON shaped by the request's `jsonSchema` hint when
 * present, otherwise echoes a plain-text acknowledgement.
 *
 * Server-only.
 */

import {
  ProviderError,
  type AiProvider,
  type ProviderRequest,
  type ProviderResponse,
} from '../provider'

function roughTokenCount(text: string): number {
  // ~4 chars per token is a reasonable approximation for telemetry only.
  return Math.max(1, Math.ceil(text.length / 4))
}

function shapeFromSchema(schema: Record<string, unknown> | undefined): unknown {
  if (!schema) return 'mock-response'
  // Best-effort shaping for the common case of { type: 'object', properties: {...} }.
  if (schema.type === 'object' && schema.properties && typeof schema.properties === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(schema.properties as Record<string, unknown>)) {
      const v = value as Record<string, unknown>
      switch (v.type) {
        case 'string':
          out[key] = `mock:${key}`
          break
        case 'number':
          out[key] = 0
          break
        case 'boolean':
          out[key] = false
          break
        case 'array':
          out[key] = []
          break
        case 'object':
          out[key] = shapeFromSchema(v as Record<string, unknown>)
          break
        default:
          out[key] = null
      }
    }
    return out
  }
  if (schema.type === 'array') return []
  if (schema.type === 'string') return 'mock-response'
  if (schema.type === 'number') return 0
  if (schema.type === 'boolean') return false
  return 'mock-response'
}

export const mockProvider: AiProvider = {
  key: 'mock',
  label: 'Mock Provider (deterministic)',
  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    if (!request.model) {
      throw new ProviderError('invalid_response', 'No model specified for mock provider.')
    }
    const content = request.jsonSchema
      ? JSON.stringify(shapeFromSchema(request.jsonSchema))
      : `mock response for ${request.model}`
    const inputTokens = request.messages.reduce((sum, m) => sum + roughTokenCount(m.content), 0)
    return {
      content,
      usage: {
        inputTokens,
        outputTokens: roughTokenCount(content),
      },
      model: request.model,
      finishReason: 'stop',
    }
  },
}
