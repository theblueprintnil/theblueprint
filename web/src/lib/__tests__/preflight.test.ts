import { describe, expect, it } from 'vitest'
import {
  checkAgentServiceUrl,
  checkAppConnectionPairing,
  checkClerkKeyMode,
  checkEngineDbShared,
  checkEngineDirectConnection,
  checkOmniRouteVars,
  checkStripeBilling,
  checkTokenPairing,
  checkWebDbConsistency,
  isPlaceholder,
  runPreflight,
  type PreflightEnvSource,
} from '../preflight'

const DIRECT = 'postgresql://postgres:pw@db.abc123.supabase.co:5432/postgres'
const POOLED = 'postgresql://postgres.abc123:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres'
const APP_DIRECT = 'postgresql://app_user:apppw@db.abc123.supabase.co:5432/postgres'
const APP_POOLED =
  'postgresql://app_user.abc123:apppw@aws-0-us-east-1.pooler.supabase.com:6543/postgres'

function makeEnv(
  overrides: {
    web?: Record<string, string | undefined>
    engine?: Record<string, string | undefined>
    engineEnvPresent?: boolean
    prod?: boolean
  } = {},
): PreflightEnvSource {
  return {
    web: {
      DATABASE_URL: DIRECT,
      DATABASE_URL_APP: APP_DIRECT,
      APP_DB_PASSWORD: 'apppw',
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc123',
      CLERK_SECRET_KEY: 'sk_test_abc123',
      ...overrides.web,
    },
    engine: {
      DATABASE_URL: DIRECT,
      AGENT_API_TOKEN: 'shared-token',
      OMNIROUTE_BASE_URL: 'https://router.blueprint.internal/v1',
      OMNIROUTE_API_KEY: 'ork_123',
      ...overrides.engine,
    },
    engineEnvPresent: overrides.engineEnvPresent ?? true,
    prod: overrides.prod ?? false,
  }
}

describe('isPlaceholder', () => {
  it('flags .env.example template values', () => {
    expect(isPlaceholder('YOUR_OMNIROUTE_API_KEY')).toBe(true)
    expect(isPlaceholder('pk_test_xxx')).toBe(true)
    expect(isPlaceholder('GENERATE_A_LONG_RANDOM_STRING')).toBe(true)
    expect(isPlaceholder('postgresql://USER:PASSWORD@HOST:5432/DATABASE')).toBe(true)
  })

  it('accepts real values', () => {
    expect(isPlaceholder('sk_live_9fJ2xQmZ')).toBe(false)
    expect(isPlaceholder(undefined)).toBe(false)
  })
})

describe('checkAppConnectionPairing', () => {
  it('passes when the embedded password matches APP_DB_PASSWORD', () => {
    expect(checkAppConnectionPairing(makeEnv()).status).toBe('pass')
  })

  it('fails when the passwords differ', () => {
    const result = checkAppConnectionPairing(makeEnv({ web: { APP_DB_PASSWORD: 'different' } }))
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('APP_DB_PASSWORD')
  })

  it('fails when the user is not app_user', () => {
    const result = checkAppConnectionPairing(makeEnv({ web: { DATABASE_URL_APP: DIRECT } }))
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('app_user')
  })
})

describe('checkWebDbConsistency', () => {
  it('accepts pooled runtime strings for the same Supabase project', () => {
    const result = checkWebDbConsistency(
      makeEnv({ web: { DATABASE_URL: POOLED, DATABASE_URL_APP: APP_POOLED } }),
    )
    expect(result.status).toBe('pass')
  })

  it('rejects strings that point at different databases', () => {
    const result = checkWebDbConsistency(
      makeEnv({
        web: { DATABASE_URL: 'postgresql://postgres:pw@db.other999.supabase.co:5432/postgres' },
      }),
    )
    expect(result.status).toBe('fail')
  })
})

describe('checkEngineDbShared / checkEngineDirectConnection', () => {
  it('skips when no agent-engine env file exists', () => {
    const env = makeEnv({ engineEnvPresent: false })
    expect(checkEngineDbShared(env).status).toBe('skip')
    expect(checkEngineDirectConnection(env).status).toBe('skip')
  })

  it('accepts a direct engine string on the same project as pooled web strings', () => {
    const env = makeEnv({
      web: { DATABASE_URL: POOLED, DATABASE_URL_APP: APP_POOLED },
      engine: { DATABASE_URL: DIRECT },
    })
    expect(checkEngineDbShared(env).status).toBe('pass')
    expect(checkEngineDirectConnection(env).status).toBe('pass')
  })

  it('fails a transaction pooler string for the engine', () => {
    const result = checkEngineDirectConnection(makeEnv({ engine: { DATABASE_URL: POOLED } }))
    expect(result.status).toBe('fail')
    expect(result.detail).toContain('session/direct')
  })
})

describe('checkAgentServiceUrl', () => {
  it('passes on an https gateway URL', () => {
    const result = checkAgentServiceUrl(
      makeEnv({ web: { AGENT_SERVICE_URL: 'https://engine.example.vercel.app' } }),
    )
    expect(result.status).toBe('pass')
  })

  it('warns when unset and fails on garbage', () => {
    expect(checkAgentServiceUrl(makeEnv()).status).toBe('warn')
    expect(
      checkAgentServiceUrl(makeEnv({ web: { AGENT_SERVICE_URL: 'localhost:8100' } })).status,
    ).toBe('fail')
  })
})

describe('checkTokenPairing', () => {
  it('fails when the tokens differ', () => {
    expect(checkTokenPairing(makeEnv({ web: { AGENT_SERVICE_TOKEN: 'other' } })).status).toBe(
      'fail',
    )
  })

  it('passes when web AGENT_SERVICE_TOKEN equals engine AGENT_API_TOKEN', () => {
    expect(
      checkTokenPairing(makeEnv({ web: { AGENT_SERVICE_TOKEN: 'shared-token' } })).status,
    ).toBe('pass')
  })
})

describe('checkOmniRouteVars', () => {
  it('fails when OmniRoute credentials are missing or placeholders', () => {
    expect(checkOmniRouteVars(makeEnv({ engine: { OMNIROUTE_API_KEY: undefined } })).status).toBe(
      'fail',
    )
    const result = checkOmniRouteVars(
      makeEnv({ engine: { OMNIROUTE_BASE_URL: 'https://omniroute.example.com/v1' } }),
    )
    expect(result.status).toBe('fail')
  })
})

describe('checkClerkKeyMode', () => {
  it('fails on mixed live/test keys', () => {
    expect(checkClerkKeyMode(makeEnv({ web: { CLERK_SECRET_KEY: 'sk_live_abc' } })).status).toBe(
      'fail',
    )
  })

  it('fails on test keys in prod mode and passes live keys', () => {
    const testKeys = {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc',
      CLERK_SECRET_KEY: 'sk_test_abc',
    }
    expect(checkClerkKeyMode(makeEnv({ web: testKeys, prod: true })).status).toBe('fail')
    const liveKeys = {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_abc',
      CLERK_SECRET_KEY: 'sk_live_abc',
    }
    expect(checkClerkKeyMode(makeEnv({ web: liveKeys, prod: true })).status).toBe('pass')
  })
})

describe('checkStripeBilling', () => {
  it('skips when billing is not configured', () => {
    expect(checkStripeBilling(makeEnv()).status).toBe('skip')
  })

  it('warns on a partial configuration and fails it in prod mode', () => {
    const web = { STRIPE_SECRET_KEY: 'sk_live_abc' }
    expect(checkStripeBilling(makeEnv({ web })).status).toBe('warn')
    expect(checkStripeBilling(makeEnv({ web, prod: true })).status).toBe('fail')
  })

  it('passes a complete live configuration in prod mode', () => {
    const web = {
      STRIPE_SECRET_KEY: 'sk_live_abc',
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_live_abc',
      STRIPE_WEBHOOK_SECRET: 'whsec_abc',
      STRIPE_PRICE_STARTER: 'price_1',
      STRIPE_PRICE_GROWTH: 'price_2',
      STRIPE_PRICE_PREMIUM: 'price_3',
    }
    expect(checkStripeBilling(makeEnv({ web, prod: true })).status).toBe('pass')
  })
})

describe('runPreflight', () => {
  it('surfaces a broken pairing as a failure', () => {
    const results = runPreflight(makeEnv({ web: { APP_DB_PASSWORD: 'different' } }))
    expect(
      results.filter((result) => result.status === 'fail').map((result) => result.id),
    ).toContain('app-connection')
  })

  it('produces no failures for a consistent env', () => {
    const results = runPreflight(makeEnv({ web: { AGENT_SERVICE_TOKEN: 'shared-token' } }))
    expect(results.filter((result) => result.status === 'fail')).toHaveLength(0)
  })
})
