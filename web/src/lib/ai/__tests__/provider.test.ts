import { describe, expect, it } from 'vitest'
import { mockProvider } from '../providers/mock'
import { ProviderError, parseJsonResponse } from '../provider'
import { z } from 'zod'


describe('mockProvider', () => {
  it('returns deterministic JSON when a schema hint is provided', async () => {
    const response = await mockProvider.complete({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'hi' }],
      jsonSchema: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          fitScore: { type: 'number' },
          redFlags: { type: 'array' },
        },
      },
    })
    const parsed = JSON.parse(response.content)
    expect(parsed.summary).toBe('mock:summary')
    expect(parsed.fitScore).toBe(0)
    expect(parsed.redFlags).toEqual([])
    expect(response.usage.inputTokens).toBeGreaterThan(0)
    expect(response.usage.outputTokens).toBeGreaterThan(0)
  })

  it('returns a plain-text acknowledgement without a schema', async () => {
    const response = await mockProvider.complete({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'hello' }],
    })
    expect(response.content).toContain('mock response')
  })

  it('throws when no model is specified', async () => {
    await expect(
      mockProvider.complete({ model: '', messages: [] }),
    ).rejects.toBeInstanceOf(ProviderError)
  })
})

describe('parseJsonResponse', () => {
  const schema = z.object({ summary: z.string(), fitScore: z.number() })

  it('parses and validates valid JSON', () => {
    const result = parseJsonResponse('{"summary":"ok","fitScore":80}', schema)
    expect(result.summary).toBe('ok')
    expect(result.fitScore).toBe(80)
  })

  it('throws ProviderError on non-JSON', () => {
    expect(() => parseJsonResponse('not json', schema)).toThrow(ProviderError)
  })

  it('throws ProviderError on schema mismatch', () => {
    expect(() => parseJsonResponse('{"summary":"ok"}', schema)).toThrow(ProviderError)
  })
})
