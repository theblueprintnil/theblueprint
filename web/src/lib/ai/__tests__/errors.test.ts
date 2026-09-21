import { describe, expect, it } from 'vitest'
import { AiError, toSafeError } from '../errors'
import { ProviderError } from '../provider'

describe('toSafeError', () => {
  it('preserves AiError code and message', () => {
    const error = new AiError('entitlement_denied', 'Feature not on your plan.')
    const safe = toSafeError(error)
    expect(safe.code).toBe('entitlement_denied')
    expect(safe.message).toBe('Feature not on your plan.')
    expect(safe.status).toBe(402)
  })

  it('maps a ProviderError auth failure to a safe message', () => {
    const error = new ProviderError('auth', 'OpenAI key invalid: sk-xxx', {
      upstreamMessage: 'Invalid key sk-SECRET',
    })
    const safe = toSafeError(error)
    expect(safe.code).toBe('provider_failure')
    expect(safe.message).not.toContain('sk-SECRET')
    expect(safe.message).not.toContain('sk-xxx')
    expect(safe.status).toBe(502)
  })

  it('maps a ProviderError rate_limited to 429', () => {
    const error = new ProviderError('rate_limited', 'Too many requests')
    const safe = toSafeError(error)
    expect(safe.code).toBe('rate_limited')
    expect(safe.status).toBe(429)
  })

  it('maps a ProviderError schema_validation to invalid_output', () => {
    const error = new ProviderError('schema_validation', 'bad json', {
      upstreamMessage: 'missing field "summary"',
    })
    const safe = toSafeError(error)
    expect(safe.code).toBe('invalid_output')
    expect(safe.status).toBe(502)
  })

  it('never leaks unknown error messages', () => {
    const safe = toSafeError(new Error('internal: db password is hunter2'))
    expect(safe.code).toBe('unknown')
    expect(safe.message).not.toContain('hunter2')
    expect(safe.message).not.toContain('internal')
    expect(safe.status).toBe(500)
  })
})

describe('AiError status codes', () => {
  it('assigns default HTTP statuses per code', () => {
    expect(new AiError('forbidden', 'x').status).toBe(403)
    expect(new AiError('not_found', 'x').status).toBe(404)
    expect(new AiError('rate_limited', 'x').status).toBe(429)
    expect(new AiError('invalid_input', 'x').status).toBe(400)
    expect(new AiError('invalid_output', 'x').status).toBe(502)
  })

  it('allows overriding the status', () => {
    expect(new AiError('forbidden', 'x', { status: 418 }).status).toBe(418)
  })
})
