import { createSign, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'

export const AGENT_JWT_SCOPES = ['a2a:read', 'a2a:task:execute'] as const

export interface MintAgentJwtInput {
  organizationId: string
  privateKeyPem?: string
  keyId?: string
  issuer?: string
  audience?: string
  ttlSeconds?: number
}

const ISSUER = process.env.AGENT_JWT_ISSUER ?? 'https://agents.blueprint.local'
const AUDIENCE = process.env.AGENT_JWT_AUDIENCE ?? 'blueprint-agent-gateway'
const KEY_ID = process.env.AGENT_INTERNAL_JWT_KEY_ID ?? 'internal-web'
const AGENT_ID = process.env.AGENT_INTERNAL_AGENT_ID ?? 'blueprint-web-dispatcher'

let cachedKey: string | null = null

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function resolvePrivateKey(override?: string): string {
  if (override) return override
  const inlineKey = process.env.AGENT_INTERNAL_JWT_KEY?.trim()
  if (inlineKey) return inlineKey
  const keyPath = process.env.AGENT_INTERNAL_JWT_KEY_PATH
  if (!keyPath) {
    throw new Error(
      'AGENT_INTERNAL_JWT_KEY or AGENT_INTERNAL_JWT_KEY_PATH is not configured. See web/.env.example. Shared secrets are retired.',
    )
  }
  if (cachedKey === null) {
    const loaded = readFileSync(keyPath, 'utf8')
    cachedKey = loaded
    return loaded
  }
  return cachedKey
}

export function mintAgentJwt(input: MintAgentJwtInput): string {
  const privateKey = resolvePrivateKey(input.privateKeyPem)
  const keyId = input.keyId ?? KEY_ID
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT', kid: keyId }
  const claims = {
    sub: AGENT_ID,
    iss: input.issuer ?? ISSUER,
    aud: input.audience ?? AUDIENCE,
    exp: now + (input.ttlSeconds ?? 120),
    iat: now,
    jti: randomUUID(),
    tenant_id: input.organizationId,
    org_id: input.organizationId,
    agent_id: AGENT_ID,
    scopes: [...AGENT_JWT_SCOPES],
    delegation_depth: 0,
  }
  const encodedHeader = toBase64Url(JSON.stringify(header))
  const encodedClaims = toBase64Url(JSON.stringify(claims))
  const signer = createSign('RSA-SHA256')
  signer.update(`${encodedHeader}.${encodedClaims}`)
  const signature = signer.sign(privateKey).toString('base64url')
  return `${encodedHeader}.${encodedClaims}.${signature}`
}
