import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { mintAgentJwt } from '../src/lib/agent/agent-jwt'
import { runPreflight, summarizePreflight, type PreflightResult } from '../src/lib/preflight'

const flags = new Set(process.argv.slice(2))
const prod = flags.has('--prod')
const connect = flags.has('--connect')
const probe = flags.has('--probe')

function parseEnvFile(file: string): Record<string, string> {
  const parsed: Record<string, string> = {}
  if (!existsSync(file)) return parsed
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    parsed[key] = value
  }
  return parsed
}

function loadEnv(file: string): Record<string, string | undefined> {
  const parsed = parseEnvFile(file)
  const merged: Record<string, string | undefined> = { ...parsed }
  for (const key of Object.keys(parsed)) {
    const override = process.env[key]
    if (override !== undefined && override !== '') merged[key] = override
  }
  return merged
}

function print(results: PreflightResult[]): void {
  for (const result of results) {
    const mark =
      result.status === 'pass'
        ? 'PASS'
        : result.status === 'warn'
          ? 'WARN'
          : result.status === 'fail'
            ? 'FAIL'
            : 'SKIP'
    const detail = result.detail ? ` — ${result.detail}` : ''
    console.log(`${mark.padEnd(5)} ${result.label}${detail}`)
  }
}

async function connectCheck(
  id: string,
  label: string,
  url: string | undefined,
  expectedUser?: string,
): Promise<PreflightResult> {
  if (!url) return { id, label, status: 'skip', detail: 'no URL configured' }
  const prisma = new PrismaClient({ datasourceUrl: url })
  try {
    const timeout = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error('timed out after 15s')), 15000)
      timer.unref()
    })
    const rows = await Promise.race([
      prisma.$queryRaw<
        { user: string; db: string }[]
      >`SELECT current_user AS user, current_database() AS db`,
      timeout,
    ])
    const row = rows[0]
    if (!row) return { id, label, status: 'fail', detail: 'query returned no rows' }
    if (expectedUser && row.user !== expectedUser) {
      return {
        id,
        label,
        status: 'fail',
        detail: `connected as ${row.user}, expected ${expectedUser}`,
      }
    }
    return { id, label, status: 'pass', detail: `connected as ${row.user} on ${row.db}` }
  } catch (error) {
    return {
      id,
      label,
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    }
  } finally {
    await prisma.$disconnect()
  }
}

async function probeChecks(webEnv: Record<string, string | undefined>): Promise<PreflightResult[]> {
  const results: PreflightResult[] = []
  const base = webEnv.AGENT_SERVICE_URL?.trim().replace(/\/+$/, '')
  const keyPath = webEnv.AGENT_INTERNAL_JWT_KEY_PATH?.trim()
  if (!base || !keyPath) {
    results.push({
      id: 'probe-health',
      label: 'gateway probe',
      status: 'skip',
      detail: 'AGENT_SERVICE_URL or AGENT_INTERNAL_JWT_KEY_PATH not set',
    })
    return results
  }
  try {
    const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(15000) })
    results.push(
      health.ok
        ? { id: 'probe-health', label: 'gateway /health reachable', status: 'pass', detail: base }
        : {
            id: 'probe-health',
            label: 'gateway /health reachable',
            status: 'fail',
            detail: `HTTP ${health.status} from ${base}/health`,
          },
    )
    if (!health.ok) return results
  } catch (error) {
    results.push({
      id: 'probe-health',
      label: 'gateway /health reachable',
      status: 'fail',
      detail: `${base}/health — ${error instanceof Error ? error.message : String(error)}`,
    })
    return results
  }
  try {
    const token = mintAgentJwt({
      organizationId: 'preflight-probe',
      privateKeyPem: readFileSync(keyPath, 'utf8'),
      keyId: webEnv.AGENT_INTERNAL_JWT_KEY_ID?.trim() || 'internal-web',
      issuer: webEnv.AGENT_JWT_ISSUER?.trim() || undefined,
      audience: webEnv.AGENT_JWT_AUDIENCE?.trim() || undefined,
    })
    const response = await fetch(`${base}/agent/run`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'agent.run', params: {} }),
      signal: AbortSignal.timeout(15000),
    })
    if (response.status === 401) {
      results.push({
        id: 'probe-token',
        label: 'gateway accepts internal agent JWT',
        status: 'fail',
        detail: 'HTTP 401: the pinned public PEM does not match AGENT_INTERNAL_JWT_KEY_PATH',
      })
    } else if (response.ok) {
      results.push({
        id: 'probe-token',
        label: 'gateway accepts internal agent JWT',
        status: 'pass',
        detail: 'authorized (empty params rejected with a JSON-RPC error, no task dispatched)',
      })
    } else {
      results.push({
        id: 'probe-token',
        label: 'gateway accepts internal agent JWT',
        status: 'warn',
        detail: `unexpected HTTP ${response.status}; verify manually`,
      })
    }
  } catch (error) {
    results.push({
      id: 'probe-token',
      label: 'gateway accepts internal agent JWT',
      status: 'fail',
      detail: error instanceof Error ? error.message : String(error),
    })
  }
  return results
}

async function main(): Promise<void> {
  console.log(`blueprint preflight${prod ? ' (prod mode)' : ''}`)
  const webEnv = loadEnv(path.join(process.cwd(), '.env'))
  const engineFile = path.join(process.cwd(), '..', 'agent-engine', '.env')
  const engineEnv = loadEnv(engineFile)
  const results = runPreflight({
    web: webEnv,
    engine: engineEnv,
    engineEnvPresent: existsSync(engineFile),
    prod,
  })
  if (connect) {
    results.push(
      await connectCheck('connect-privileged', 'connect: web DATABASE_URL', webEnv.DATABASE_URL),
    )
    results.push(
      await connectCheck(
        'connect-app',
        'connect: web DATABASE_URL_APP as app_user',
        webEnv.DATABASE_URL_APP,
        'app_user',
      ),
    )
    results.push(
      await connectCheck(
        'connect-engine',
        'connect: agent-engine DATABASE_URL',
        engineEnv.DATABASE_URL,
        undefined,
      ),
    )
  }
  if (probe) results.push(...(await probeChecks(webEnv)))
  print(results)
  const summary = summarizePreflight(results)
  console.log(
    `\n${summary.passed} passed, ${summary.warnings} warnings, ${summary.failures} failed, ${summary.skipped} skipped`,
  )
  if (summary.failures > 0) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
