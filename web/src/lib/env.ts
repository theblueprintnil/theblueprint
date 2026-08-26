export interface EnvVarSpec {
  name: string
  tier: 'critical' | 'reserved'
  description: string
}

export const ENV_SPECS: EnvVarSpec[] = [
  {
    name: 'DATABASE_URL',
    tier: 'critical',
    description: 'Privileged Prisma connection (migrations, auth reads)',
  },
  {
    name: 'DATABASE_URL_APP',
    tier: 'critical',
    description: 'RLS-scoped app_user connection for tenant queries',
  },
  {
    name: 'APP_DB_PASSWORD',
    tier: 'critical',
    description: 'Password used by scripts/apply-rls.ts to create/refresh app_user',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    tier: 'reserved',
    description: 'Supabase project URL (used from Phase 2 onward)',
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    tier: 'reserved',
    description: 'Supabase anon key (used from Phase 2 onward)',
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    tier: 'reserved',
    description: 'Supabase service-role key, server-only',
  },
  {
    name: 'SESSION_SECRET',
    tier: 'reserved',
    description: 'Future signing secret for stateless sessions',
  },
]

export function collectEnvIssues(env: Record<string, string | undefined> = process.env): {
  missingCritical: EnvVarSpec[]
  missingReserved: EnvVarSpec[]
} {
  const missingCritical: EnvVarSpec[] = []
  const missingReserved: EnvVarSpec[] = []
  for (const spec of ENV_SPECS) {
    const value = env[spec.name]
    if (!value || value.trim() === '') {
      ;(spec.tier === 'critical' ? missingCritical : missingReserved).push(spec)
    }
  }
  return { missingCritical, missingReserved }
}

export class MissingEnvironmentVariablesError extends Error {
  readonly variables: EnvVarSpec[]

  constructor(variables: EnvVarSpec[]) {
    const list = variables.map((v) => `  - ${v.name}: ${v.description}`).join('\n')
    super(`Missing required environment variables:\n${list}\nSee web/.env.example for setup.`)
    this.name = 'MissingEnvironmentVariablesError'
    this.variables = variables
  }
}

export function validateEnv(env: Record<string, string | undefined> = process.env): void {
  const { missingCritical } = collectEnvIssues(env)
  if (missingCritical.length > 0) {
    throw new MissingEnvironmentVariablesError(missingCritical)
  }
}
