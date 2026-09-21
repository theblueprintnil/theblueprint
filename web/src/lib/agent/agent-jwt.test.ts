import { createVerify, generateKeyPairSync } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { mintAgentJwt } from './agent-jwt'

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

function decodeSegment(segment: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
}

function mint(organizationId = 'org-1') {
  return mintAgentJwt({
    organizationId,
    privateKeyPem: privateKey,
    keyId: 'internal-web',
    ttlSeconds: 90,
  })
}

describe('mintAgentJwt', () => {
  it('mints a verifiable RS256 token with the full claim set', () => {
    const token = mint()
    const [header, payload, signature] = token.split('.')
    expect(header).toBeTruthy()
    expect(payload).toBeTruthy()
    expect(signature).toBeTruthy()
    expect(decodeSegment(header)).toEqual({ alg: 'RS256', typ: 'JWT', kid: 'internal-web' })
    const claims = decodeSegment(payload)
    expect(claims.tenant_id).toBe('org-1')
    expect(claims.org_id).toBe('org-1')
    expect(claims.agent_id).toBe('blueprint-web-dispatcher')
    expect(claims.scopes).toEqual(['a2a:read', 'a2a:task:execute'])
    expect(claims.delegation_depth).toBe(0)
    expect(typeof claims.jti).toBe('string')
    expect((claims.exp as number) - (claims.iat as number)).toBe(90)
    const verifier = createVerify('RSA-SHA256')
    verifier.update(`${header}.${payload}`)
    expect(verifier.verify(publicKey, Buffer.from(signature, 'base64url'))).toBe(true)
  })

  it('mints a fresh jti per call', () => {
    const first = decodeSegment(mint().split('.')[1])
    const second = decodeSegment(mint().split('.')[1])
    expect(first.jti).not.toBe(second.jti)
  })

  it('binds the organization to both tenant claims', () => {
    const claims = decodeSegment(mint('org-42').split('.')[1])
    expect(claims.tenant_id).toBe('org-42')
    expect(claims.org_id).toBe('org-42')
  })
})
