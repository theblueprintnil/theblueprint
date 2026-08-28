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
  {
    name: 'STRIPE_SECRET_KEY',
    tier: 'reserved',
    description: 'Stripe API secret key (server-only; never expose to the browser)',
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    tier: 'reserved',
    description: 'Stripe webhook signing secret used to verify event signatures',
  },
  {
    name: 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
    tier: 'reserved',
    description: 'Stripe publishable key (safe for browser use)',
  },
  {
    name: 'STRIPE_PRICE_STARTER',
    tier: 'reserved',
    description: 'Stripe Price ID for the Starter plan',
  },
  {
    name: 'STRIPE_PRICE_GROWTH',
    tier: 'reserved',
    description: 'Stripe Price ID for the Growth plan',
  },
  {
    name: 'STRIPE_PRICE_PREMIUM',
    tier: 'reserved',
    description: 'Stripe Price ID for the Premium plan',
  },
  {
    name: 'AI_PROVIDER',
    tier: 'reserved',
    description: 'Active AI provider key (e.g. "openai", "anthropic", "mock"). Defaults to "mock".',
  },
  {
    name: 'AI_DEFAULT_MODEL',
    tier: 'reserved',
    description: 'Default model identifier used when a feature does not specify one.',
  },
  {
    name: 'OPENAI_API_KEY',
    tier: 'reserved',
    description: 'OpenAI API key (server-only; never expose to the browser).',
  },
  {
    name: 'ANTHROPIC_API_KEY',
    tier: 'reserved',
    description: 'Anthropic API key (server-only; never expose to the browser).',
  },
  {
    name: 'AI_RATE_LIMIT_PER_MINUTE',
    tier: 'reserved',
    description: 'Per-organization AI request limit per minute. Defaults to 20.',
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
