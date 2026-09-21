/**
 * OpenAI provider adapter.
 *
 * Wraps the OpenAI SDK behind the provider-agnostic `AiProvider` interface so
 * feature code never imports the SDK directly. Server-only.
 *
 * The SDK is loaded lazily so the package is only required when this provider
 * is actually selected — keeping the mock-only dev path dependency-free.
 */

import {
  ProviderError,
  type AiProvider,
  type ProviderRequest,
  type ProviderResponse,
} from '../provider'

interface OpenAiChatChoice {
  message?: { content?: string | null }
  finish_reason?: string | null
}
interface OpenAiUsage {
  prompt_tokens?: number
  completion_tokens?: number
}
interface OpenAiChatCompletion {
  model: string
  choices?: OpenAiChatChoice[]
  usage?: OpenAiUsage
}

interface OpenAiClient {
  chat: {
    completions: {
      create(args: Record<string, unknown>): Promise<OpenAiChatCompletion>
    }
  }
}

let cachedClient: OpenAiClient | null = null

async function getClient(): Promise<OpenAiClient> {
  if (cachedClient) return cachedClient
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.trim() === '') {
    throw new ProviderError(
      'auth',
      'OpenAI provider selected but OPENAI_API_KEY is not configured.',
    )
  }
  // Lazy import so the dependency is optional.
  const mod = (await import('openai')) as unknown as {
    default: new (config: { apiKey: string }) => OpenAiClient
  }
  cachedClient = new mod.default({ apiKey })
  return cachedClient
}

export const openaiProvider: AiProvider = {
  key: 'openai',
  label: 'OpenAI',
  async complete(request: ProviderRequest): Promise<ProviderResponse> {
    let client: OpenAiClient
    try {
      client = await getClient()
    } catch (error) {
      if (error instanceof ProviderError) throw error
      throw new ProviderError('auth', 'Failed to initialize OpenAI client.', {
        cause: error,
        upstreamMessage: error instanceof Error ? error.message : undefined,
      })
    }

    const args: Record<string, unknown> = {
      model: request.model,
      messages: request.messages,
    }
    if (request.temperature !== undefined) args.temperature = request.temperature
    if (request.maxOutputTokens !== undefined) args.max_tokens = request.maxOutputTokens
    if (request.jsonSchema) {
      // Request strict JSON output. The orchestrator still validates with Zod.
      args.response_format = { type: 'json_object' }
    }

    let completion: OpenAiChatCompletion
    try {
      completion = await client.chat.completions.create(args)
    } catch (error) {
      throw toProviderError(error)
    }

    const choice = completion.choices?.[0]
    const content = choice?.message?.content ?? ''
    if (!content) {
      throw new ProviderError('invalid_response', 'OpenAI returned an empty completion.', {
        upstreamMessage: JSON.stringify(completion).slice(0, 500),
      })
    }
    return {
      content,
      usage: {
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      },
      model: completion.model ?? request.model,
      finishReason: choice?.finish_reason ?? undefined,
    }
  },
}

function toProviderError(error: unknown): ProviderError {
  if (error instanceof ProviderError) return error
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()
  if (lower.includes('rate limit') || lower.includes('429')) {
    return new ProviderError('rate_limited', 'OpenAI rate limit reached.', {
      retryable: true,
      upstreamMessage: message,
      cause: error,
    })
  }
  if (lower.includes('quota') || lower.includes('insufficient_quota')) {
    return new ProviderError('quota', 'OpenAI quota exhausted.', {
      upstreamMessage: message,
      cause: error,
    })
  }
  if (lower.includes('timeout') || lower.includes('etimedout')) {
    return new ProviderError('timeout', 'OpenAI request timed out.', {
      retryable: true,
      upstreamMessage: message,
      cause: error,
    })
  }
  if (lower.includes('api key') || lower.includes('401') || lower.includes('unauthorized')) {
    return new ProviderError('auth', 'OpenAI authentication failed.', {
      upstreamMessage: message,
      cause: error,
    })
  }
  return new ProviderError('unknown', 'OpenAI request failed.', {
    upstreamMessage: message,
    cause: error,
  })
}
