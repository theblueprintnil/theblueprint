/**
 * Anthropic provider adapter.
 *
 * Wraps the Anthropic SDK behind the provider-agnostic `AiProvider` interface.
 * Server-only. Loaded lazily so the dependency is optional.
 */

import { ProviderError, type AiProvider, type ProviderRequest, type ProviderResponse } from '../provider'

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}
interface AnthropicResponse {
  content?: Array<{ type: string; text?: string }>
  model?: string
  stop_reason?: string | null
  usage?: { input_tokens?: number; output_tokens?: number }
}

interface AnthropicClient {
  messages: {
    create(args: Record<string, unknown>): Promise<AnthropicResponse>
  }
}

let cachedClient: AnthropicClient | null = null

async function getClient(): Promise<AnthropicClient> {
  if (cachedClient) return cachedClient
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new ProviderError('auth', 'Anthropic provider selected but ANTHROPIC_API_KEY is not configured.')
  }
  const mod = (await import('@anthropic-ai/sdk')) as unknown as {
    default: new (config: { apiKey: string }) => AnthropicClient
  }
  cachedClient = new mod.default({ apiKey })
  return cachedClient
}

export const anthropicProvider: AiProvider = {
  key: 'anthropic',
  label: 'Anthropic',
  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    let client: AnthropicClient
    try {
      client = await getClient()
    } catch (error) {
      if (error instanceof ProviderError) throw error
      throw new ProviderError('auth', 'Failed to initialize Anthropic client.', {
        cause: error,
        upstreamMessage: error instanceof Error ? error.message : undefined,
      })
    }

    const system = request.messages.find((m) => m.role === 'system')?.content
    const turns: AnthropicMessage[] = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const args: Record<string, unknown> = {
      model: request.model,
      messages: turns,
      max_tokens: request.maxOutputTokens ?? 1024,
    }
    if (system) args.system = system
    if (request.temperature !== undefined) args.temperature = request.temperature
    if (request.jsonSchema) {
      // Anthropic supports tool-use for strict JSON; here we instruct via system
      // and rely on the orchestrator's Zod validation to enforce the shape.
      args.system = `${system ?? ''}\n\nReturn ONLY valid JSON matching this schema: ${JSON.stringify(request.jsonSchema)}`.trim()
    }

    let response: AnthropicResponse
    try {
      response = await client.messages.create(args)
    } catch (error) {
      throw toProviderError(error)
    }

    const text = response.content
      ?.filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('')
    if (!text) {
      throw new ProviderError('invalid_response', 'Anthropic returned an empty response.', {
        upstreamMessage: JSON.stringify(response).slice(0, 500),
      })
    }
    return {
      content: text,
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
      model: response.model ?? request.model,
      finishReason: response.stop_reason ?? undefined,
    }
  },
}

function toProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()
  if (lower.includes('rate') || lower.includes('429')) {
    return new ProviderError('rate_limited', 'Anthropic rate limit reached.', {
      retryable: true,
      upstreamMessage: message,
      cause: error,
    })
  }
  if (lower.includes('credit') || lower.includes('quota')) {
    return new ProviderError('quota', 'Anthropic credit balance exhausted.', {
      upstreamMessage: message,
      cause: error,
    })
  }
  if (lower.includes('timeout')) {
    return new ProviderError('timeout', 'Anthropic request timed out.', {
      retryable: true,
      upstreamMessage: message,
      cause: error,
    })
  }
  if (lower.includes('api key') || lower.includes('401') || lower.includes('authentication')) {
    return new ProviderError('auth', 'Anthropic authentication failed.', { upstreamMessage: message, cause: error })
  }
  return new ProviderError('unknown', 'Anthropic request failed.', { upstreamMessage: message, cause: error })
}
