import { describe, expect, it } from 'vitest'
import { ENV_SPECS, MissingEnvironmentVariablesError, collectEnvIssues, validateEnv } from '../env'

function fakeEnv(overrides: Record<string, string | undefined> = {}) {
  const base: Record<string, string | undefined> = {}
  for (const spec of ENV_SPECS) base[spec.name] = 'x'
  return { ...base, ...overrides }
}

describe('collectEnvIssues', () => {
  it('reports nothing when every variable is set', () => {
    const issues = collectEnvIssues(fakeEnv())
    expect(issues.missingCritical).toHaveLength(0)
    expect(issues.missingReserved).toHaveLength(0)
  })

  it('separates critical from reserved variables', () => {
    const issues = collectEnvIssues(
      fakeEnv({ DATABASE_URL: '', NEXT_PUBLIC_SUPABASE_URL: undefined, APP_DB_PASSWORD: '   ' }),
    )
    expect(issues.missingCritical.map((v) => v.name)).toEqual(['DATABASE_URL', 'APP_DB_PASSWORD'])
    expect(issues.missingReserved.map((v) => v.name)).toContain('NEXT_PUBLIC_SUPABASE_URL')
  })

  it('treats the Clerk keys as critical auth dependencies', () => {
    const clerkSpecs = ENV_SPECS.filter((v) => v.name.toLowerCase().includes('clerk'))
    expect(clerkSpecs.map((v) => v.name)).toEqual([
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY',
    ])
    expect(clerkSpecs.every((v) => v.tier === 'critical')).toBe(true)
  })
})

describe('validateEnv', () => {
  it('does not throw when critical variables exist', () => {
    expect(() => validateEnv(fakeEnv())).not.toThrow()
  })

  it('throws MissingEnvironmentVariablesError listing the offenders', () => {
    try {
      validateEnv(fakeEnv({ DATABASE_URL_APP: '' }))
      expect.unreachable('expected throw')
    } catch (error) {
      expect(error).toBeInstanceOf(MissingEnvironmentVariablesError)
      if (error instanceof MissingEnvironmentVariablesError) {
        expect(error.variables.map((v) => v.name)).toEqual(['DATABASE_URL_APP'])
        expect(error.message).toContain('DATABASE_URL_APP')
        expect(error.message).toContain('.env.example')
      }
    }
  })

  it('treats whitespace-only values as missing', () => {
    expect(() => validateEnv(fakeEnv({ DATABASE_URL: '   ', DATABASE_URL_APP: '\t' }))).toThrow(
      MissingEnvironmentVariablesError,
    )
  })
})
