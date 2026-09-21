import { collectEnvIssues } from './env'

export type PreflightStatus = 'pass' | 'warn' | 'fail' | 'skip'

export interface PreflightResult {
  id: string
  label: string
  status: PreflightStatus
  detail?: string
}

export interface PreflightEnvSource {
  web: Record<string, string | undefined>
  engine: Record<string, string | undefined>
  engineEnvPresent: boolean
  prod: boolean
}

const PLACEHOLDER_MARKERS = [
  'YOUR_',
  'GENERATE_A_LONG_RANDOM_STRING',
  'example.com',
  '_xxx',
  'APP_PASSWORD',
  'USER:PASSWORD@HOST',
]

const WEB_PLACEHOLDER_VARS = [
  'DATABASE_URL',
  'DATABASE_URL_APP',
  'APP_DB_PASSWORD',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'AGENT_SERVICE_URL',
  'AGENT_INTERNAL_JWT_KEY_PATH',
  'AGENT_INTERNAL_JWT_KEY_ID',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
]

const ENGINE_PLACEHOLDER_VARS = [
  'DATABASE_URL',
  'AGENT_DATABASE_URL',
  'OMNIROUTE_BASE_URL',
  'OMNIROUTE_API_KEY',
]

export function isPlaceholder(value: string | undefined): boolean {
  if (!value) return false
  const trimmed = value.trim()
  return PLACEHOLDER_MARKERS.some((marker) => trimmed.includes(marker))
}

function parseDbUrl(value: string | undefined): URL | null {
  if (!value || value.trim() === '') return null
  try {
    return new URL(value.trim())
  } catch {
    return null
  }
}

function dbDatabase(url: URL): string {
  return url.pathname.replace(/^\//, '')
}

function isPoolerUrl(url: URL): boolean {
  return (
    url.port === '6543' ||
    url.searchParams.get('pgbouncer') === 'true' ||
    /pooler\./i.test(url.hostname)
  )
}

function supabaseProjectRef(url: URL): string | null {
  const direct = /^db\.([a-z0-9]+)\.supabase\.(co|com|net)$/i.exec(url.hostname)
  if (direct) return direct[1] ?? null
  if (/pooler\.supabase\.(com|net)$/i.test(url.hostname)) {
    const segments = url.username.split('.')
    if (segments.length >= 2) return segments[1] ?? null
  }
  return null
}

function sameDatabase(a: URL, b: URL): boolean {
  const refA = supabaseProjectRef(a)
  const refB = supabaseProjectRef(b)
  if (refA && refB) return refA === refB
  return a.hostname === b.hostname && dbDatabase(a) === dbDatabase(b)
}

function describeDb(url: URL): string {
  return `${url.username}@${url.hostname}:${url.port || '5432'}/${dbDatabase(url)}`
}

export function checkWebCriticalVars(env: PreflightEnvSource): PreflightResult {
  const label = 'web critical environment variables'
  const { missingCritical } = collectEnvIssues(env.web)
  if (missingCritical.length === 0) return { id: 'web-critical', label, status: 'pass' }
  return {
    id: 'web-critical',
    label,
    status: 'fail',
    detail: `missing ${missingCritical.map((spec) => spec.name).join(', ')}`,
  }
}

export function checkPlaceholderValues(env: PreflightEnvSource): PreflightResult {
  const label = 'template placeholder values'
  const offenders: string[] = []
  for (const name of WEB_PLACEHOLDER_VARS) {
    if (isPlaceholder(env.web[name])) offenders.push(`web ${name}`)
  }
  if (env.engineEnvPresent) {
    for (const name of ENGINE_PLACEHOLDER_VARS) {
      if (isPlaceholder(env.engine[name])) offenders.push(`engine ${name}`)
    }
  }
  if (offenders.length === 0) return { id: 'placeholders', label, status: 'pass' }
  return { id: 'placeholders', label, status: 'fail', detail: offenders.join(', ') }
}

export function checkAppConnectionPairing(env: PreflightEnvSource): PreflightResult {
  const label = 'DATABASE_URL_APP / APP_DB_PASSWORD pairing'
  const url = parseDbUrl(env.web.DATABASE_URL_APP)
  if (!url) {
    return {
      id: 'app-connection',
      label,
      status: 'fail',
      detail: 'DATABASE_URL_APP is missing or not a parsable URL',
    }
  }
  if (url.username !== 'app_user') {
    return {
      id: 'app-connection',
      label,
      status: 'fail',
      detail: `expected app_user as user, found "${url.username}"`,
    }
  }
  const password = env.web.APP_DB_PASSWORD?.trim()
  if (!password) {
    return { id: 'app-connection', label, status: 'fail', detail: 'APP_DB_PASSWORD is not set' }
  }
  if (url.password !== password) {
    return {
      id: 'app-connection',
      label,
      status: 'fail',
      detail:
        'password embedded in DATABASE_URL_APP differs from APP_DB_PASSWORD (db:rls applied APP_DB_PASSWORD to app_user)',
    }
  }
  return { id: 'app-connection', label, status: 'pass' }
}

export function checkWebDbConsistency(env: PreflightEnvSource): PreflightResult {
  const label = 'web DATABASE_URL / DATABASE_URL_APP target the same database'
  const privileged = parseDbUrl(env.web.DATABASE_URL)
  const app = parseDbUrl(env.web.DATABASE_URL_APP)
  if (!privileged || !app) {
    return {
      id: 'web-db-consistency',
      label,
      status: 'fail',
      detail: 'one of the connection strings is missing or unparsable',
    }
  }
  if (!sameDatabase(privileged, app)) {
    return {
      id: 'web-db-consistency',
      label,
      status: 'fail',
      detail: `privileged ${describeDb(privileged)} vs app ${describeDb(app)}`,
    }
  }
  return { id: 'web-db-consistency', label, status: 'pass' }
}

export function checkEngineDbShared(env: PreflightEnvSource): PreflightResult {
  const label = 'agent-engine DATABASE_URL targets the same database as web'
  if (!env.engineEnvPresent)
    return { id: 'engine-db', label, status: 'skip', detail: 'no agent-engine .env found' }
  const engine = parseDbUrl(env.engine.DATABASE_URL)
  const app = parseDbUrl(env.web.DATABASE_URL_APP)
  if (!engine || !app) {
    return {
      id: 'engine-db',
      label,
      status: 'fail',
      detail: 'engine DATABASE_URL or web DATABASE_URL_APP is missing/unparsable',
    }
  }
  if (!sameDatabase(engine, app)) {
    return {
      id: 'engine-db',
      label,
      status: 'fail',
      detail: `AgentTaskExecution rows written via ${describeDb(app)} are invisible to the worker at ${describeDb(engine)}`,
    }
  }
  return { id: 'engine-db', label, status: 'pass' }
}

export function checkEngineDirectConnection(env: PreflightEnvSource): PreflightResult {
  const label = 'agent-engine DATABASE_URL is a session/direct connection'
  if (!env.engineEnvPresent)
    return { id: 'engine-direct', label, status: 'skip', detail: 'no agent-engine .env found' }
  const engine = parseDbUrl(env.engine.DATABASE_URL)
  if (!engine) {
    return {
      id: 'engine-direct',
      label,
      status: 'fail',
      detail: 'engine DATABASE_URL is missing or not a parsable URL',
    }
  }
  if (isPoolerUrl(engine)) {
    return {
      id: 'engine-direct',
      label,
      status: 'fail',
      detail:
        'transaction pooler detected (port 6543 / pgbouncer); PostgresSaver DDL and workers need the session/direct string',
    }
  }
  return { id: 'engine-direct', label, status: 'pass' }
}

export function checkAgentServiceUrl(env: PreflightEnvSource): PreflightResult {
  const label = 'AGENT_SERVICE_URL is a valid http(s) URL'
  const value = env.web.AGENT_SERVICE_URL
  if (!value || value.trim() === '') {
    return {
      id: 'agent-service-url',
      label,
      status: 'warn',
      detail: 'not set; studio dispatch to the agent gateway is disabled',
    }
  }
  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(url.protocol)
    return { id: 'agent-service-url', label, status: 'pass', detail: url.origin }
  } catch {
    return {
      id: 'agent-service-url',
      label,
      status: 'fail',
      detail: `"${value}" is not a valid http(s) URL`,
    }
  }
}

export function checkTokenPairing(env: PreflightEnvSource): PreflightResult {
  const label = 'AGENT_SERVICE_TOKEN equals engine AGENT_API_TOKEN'
  if (!env.engineEnvPresent) {
    return {
      id: 'token-pairing',
      label,
      status: 'skip',
      detail: 'no agent-engine .env found; verify with --probe once deployed',
    }
  }
  const webToken = env.web.AGENT_SERVICE_TOKEN?.trim()
  const engineToken = env.engine.AGENT_API_TOKEN?.trim()
  if (!webToken) {
    return {
      id: 'token-pairing',
      label,
      status: 'warn',
      detail: 'AGENT_SERVICE_TOKEN is not set; studio dispatch is disabled',
    }
  }
  if (!engineToken) {
    return {
      id: 'token-pairing',
      label,
      status: 'fail',
      detail: 'engine AGENT_API_TOKEN is not set',
    }
  }
  if (webToken !== engineToken) {
    return {
      id: 'token-pairing',
      label,
      status: 'fail',
      detail: 'the two tokens differ; the gateway answers 401 when they do not match',
    }
  }
  return { id: 'token-pairing', label, status: 'pass' }
}

export function checkOmniRouteVars(env: PreflightEnvSource): PreflightResult {
  const label = 'engine OmniRoute credentials'
  if (!env.engineEnvPresent)
    return { id: 'omniroute', label, status: 'skip', detail: 'no agent-engine .env found' }
  const base = env.engine.OMNIROUTE_BASE_URL
  const key = env.engine.OMNIROUTE_API_KEY
  const missing: string[] = []
  if (!base || base.trim() === '') missing.push('OMNIROUTE_BASE_URL')
  if (!key || key.trim() === '') missing.push('OMNIROUTE_API_KEY')
  if (missing.length > 0) {
    return {
      id: 'omniroute',
      label,
      status: 'fail',
      detail: `missing ${missing.join(', ')}; the generation pipeline cannot run`,
    }
  }
  if (isPlaceholder(base) || isPlaceholder(key)) {
    return {
      id: 'omniroute',
      label,
      status: 'fail',
      detail: 'values still contain template placeholders',
    }
  }
  return { id: 'omniroute', label, status: 'pass' }
}

function clerkMode(key: string | undefined, prefix: 'pk_' | 'sk_'): 'live' | 'test' | 'unknown' {
  if (!key) return 'unknown'
  if (key.startsWith(`${prefix}live_`)) return 'live'
  if (key.startsWith(`${prefix}test_`)) return 'test'
  return 'unknown'
}

export function checkClerkKeyMode(env: PreflightEnvSource): PreflightResult {
  const label = 'Clerk key pair mode'
  const pk = clerkMode(env.web.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, 'pk_')
  const sk = clerkMode(env.web.CLERK_SECRET_KEY, 'sk_')
  if (pk === 'unknown' || sk === 'unknown') {
    return {
      id: 'clerk-mode',
      label,
      status: 'warn',
      detail: 'unrecognized Clerk key prefix; expected pk_/sk_ live or test keys',
    }
  }
  if (pk !== sk) {
    return {
      id: 'clerk-mode',
      label,
      status: 'fail',
      detail: `publishable key is ${pk} but secret key is ${sk}`,
    }
  }
  if (env.prod && pk === 'test') {
    return {
      id: 'clerk-mode',
      label,
      status: 'fail',
      detail: 'Clerk development (test) keys in prod mode; use the production instance keys',
    }
  }
  return { id: 'clerk-mode', label, status: 'pass', detail: `${pk} keys` }
}

const STRIPE_PRICE_VARS = [
  'STRIPE_PRICE_STARTER',
  'STRIPE_PRICE_GROWTH',
  'STRIPE_PRICE_PREMIUM',
] as const

export function checkStripeBilling(env: PreflightEnvSource): PreflightResult {
  const label = 'Stripe billing configuration'
  const secret = env.web.STRIPE_SECRET_KEY
  const publishable = env.web.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  const webhook = env.web.STRIPE_WEBHOOK_SECRET
  const prices = STRIPE_PRICE_VARS.map((name) => env.web[name]).filter((value): value is string =>
    Boolean(value),
  )
  const configured = [secret, publishable, webhook, ...prices].some(
    (value) => value && value.trim() !== '',
  )
  if (!configured) {
    return {
      id: 'stripe-billing',
      label,
      status: 'skip',
      detail: 'billing not configured; upgrade buttons stay disabled',
    }
  }
  const missing: string[] = []
  if (!secret) missing.push('STRIPE_SECRET_KEY')
  if (!publishable) missing.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
  if (!webhook) missing.push('STRIPE_WEBHOOK_SECRET')
  const missingPrices = STRIPE_PRICE_VARS.filter((name) => !env.web[name])
  const problems: string[] = []
  if (missing.length > 0) problems.push(`missing ${missing.join(', ')}`)
  if (missingPrices.length > 0) problems.push(`missing ${missingPrices.join(', ')}`)
  const skMode = secret?.startsWith('sk_live_')
    ? 'live'
    : secret?.startsWith('sk_test_')
      ? 'test'
      : 'unknown'
  const pkMode = publishable?.startsWith('pk_live_')
    ? 'live'
    : publishable?.startsWith('pk_test_')
      ? 'test'
      : 'unknown'
  if (secret && publishable && skMode !== 'unknown' && pkMode !== 'unknown' && skMode !== pkMode) {
    problems.push(`secret key is ${skMode} but publishable key is ${pkMode}`)
  }
  if (env.prod && skMode === 'test') problems.push('Stripe test secret key in prod mode')
  if (webhook && !webhook.startsWith('whsec_'))
    problems.push('STRIPE_WEBHOOK_SECRET does not start with whsec_')
  if (prices.some((price) => !price.startsWith('price_')))
    problems.push('price ids must start with price_')
  if (problems.length > 0) {
    return {
      id: 'stripe-billing',
      label,
      status: env.prod ? 'fail' : 'warn',
      detail: problems.join('; '),
    }
  }
  return {
    id: 'stripe-billing',
    label,
    status: 'pass',
    detail: `${skMode} mode, 3 price ids, webhook secret present`,
  }
}

export function checkPublishEndpoint(env: PreflightEnvSource): PreflightResult {
  const label = 'engine AGENT_PUBLISH_ENDPOINT'
  if (!env.engineEnvPresent)
    return { id: 'publish-endpoint', label, status: 'skip', detail: 'no agent-engine .env found' }
  const endpoint = env.engine.AGENT_PUBLISH_ENDPOINT
  if (!endpoint || endpoint.trim() === '') {
    return {
      id: 'publish-endpoint',
      label,
      status: 'warn',
      detail: 'not set; the pipeline pauses for approval but publishing stays disabled',
    }
  }
  return { id: 'publish-endpoint', label, status: 'pass', detail: endpoint }
}

export function checkAppUrl(env: PreflightEnvSource): PreflightResult {
  const label = 'NEXT_PUBLIC_APP_URL'
  const value = env.web.NEXT_PUBLIC_APP_URL
  if (!value || value.trim() === '') {
    return {
      id: 'app-url',
      label,
      status: env.prod ? 'fail' : 'warn',
      detail: env.prod
        ? 'required for production redirects and links'
        : 'not set; canonical URL defaults are skipped',
    }
  }
  if (env.prod && !value.startsWith('https://')) {
    return { id: 'app-url', label, status: 'fail', detail: 'production URL must use https' }
  }
  return { id: 'app-url', label, status: 'pass', detail: value }
}

export function runPreflight(env: PreflightEnvSource): PreflightResult[] {
  return [
    checkWebCriticalVars(env),
    checkPlaceholderValues(env),
    checkAppConnectionPairing(env),
    checkWebDbConsistency(env),
    checkEngineDbShared(env),
    checkEngineDirectConnection(env),
    checkAgentServiceUrl(env),
    checkTokenPairing(env),
    checkOmniRouteVars(env),
    checkClerkKeyMode(env),
    checkStripeBilling(env),
    checkPublishEndpoint(env),
    checkAppUrl(env),
  ]
}

export function summarizePreflight(results: PreflightResult[]): {
  passed: number
  warnings: number
  failures: number
  skipped: number
} {
  return {
    passed: results.filter((result) => result.status === 'pass').length,
    warnings: results.filter((result) => result.status === 'warn').length,
    failures: results.filter((result) => result.status === 'fail').length,
    skipped: results.filter((result) => result.status === 'skip').length,
  }
}
