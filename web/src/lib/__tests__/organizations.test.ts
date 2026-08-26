import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const state = {
    memberships: [] as Array<{
      userId: string
      role: string
      organization: { id: string; name: string; slug: string; workspaceType: string }
    }>,
    membershipRoles: new Map<string, string | null>(),
    userUpdates: [] as Array<{ id: string; data: unknown }>,
    transactionTx: null as null | {
      organization: { create: ReturnType<typeof vi.fn> }
      user: { update: ReturnType<typeof vi.fn> }
      auditLog: { create: ReturnType<typeof vi.fn> }
    },
    transactionResult: null as null | Record<string, unknown>,
  }
  return state
})

vi.mock('../db', () => ({
  prismaAuth: {
    membership: {
      findMany: vi.fn(async () => h.memberships),
      findUnique: vi.fn(
        async ({ where }: { where: { userId_organizationId: { organizationId: string } } }) => {
          const role = h.membershipRoles.get(where.userId_organizationId.organizationId)
          return role ? { id: 'm1', role } : null
        },
      ),
    },
    user: {
      update: vi.fn(async (args: { id: string; data: unknown }) => {
        h.userUpdates.push(args)
        return undefined
      }),
      findUnique: vi.fn(),
    },
    organization: { findUnique: vi.fn(async () => null) },
    $transaction: vi.fn(async (fn: (tx: never) => Promise<Record<string, unknown>>) =>
      fn(h.transactionTx as never),
    ),
  },
  withUser: vi.fn((_userId: string, fn: (tx: string) => Promise<unknown>) => fn('user-tx')),
  withOrgContext: vi.fn((_userId: string, _orgId: string, fn: (tx: string) => Promise<unknown>) =>
    fn('org-tx'),
  ),
}))

import {
  createOrganizationWithOwner,
  getMembershipRole,
  getUserOrganizations,
  resolveActiveOrganization,
} from '../organizations'
import { prismaAuth } from '../db'

describe('getUserOrganizations', () => {
  beforeEach(() => {
    h.memberships = []
  })

  it('maps membership rows into flat org summaries', async () => {
    h.memberships = [
      {
        userId: 'u1',
        role: 'OWNER',
        organization: {
          id: 'org-1',
          name: 'Carter Co',
          slug: 'carter-co',
          workspaceType: 'ATHLETE_STUDIO',
        },
      },
    ]
    const orgs = await getUserOrganizations('u1')
    expect(orgs).toEqual([
      {
        id: 'org-1',
        name: 'Carter Co',
        slug: 'carter-co',
        workspaceType: 'ATHLETE_STUDIO',
        role: 'OWNER',
      },
    ])
  })

  it('returns empty for users without memberships', async () => {
    expect(await getUserOrganizations('nobody')).toEqual([])
  })
})

describe('getMembershipRole', () => {
  it('returns the stored role', async () => {
    h.membershipRoles.set('org-x', 'ADMIN')
    expect(await getMembershipRole('u1', 'org-x')).toBe('ADMIN')
  })

  it('returns null when not a member', async () => {
    expect(await getMembershipRole('u1', 'org-missing')).toBeNull()
  })
})

describe('resolveActiveOrganization', () => {
  beforeEach(() => {
    h.memberships = []
    h.userUpdates = []
  })

  it('prefers the requested organization when accessible', async () => {
    h.memberships = [memberOrg('org-a', 'A'), memberOrg('org-b', 'B')]
    h.memberships[0]!.role = 'OWNER'
    const active = await resolveActiveOrganization('u1', 'org-b')
    expect(active?.id).toBe('org-b')
  })

  it('falls back to the first membership and syncs currentOrganizationId', async () => {
    h.memberships = [memberOrg('org-first', 'First')]
    h.memberships[0]!.role = 'MEMBER'
    const active = await resolveActiveOrganization('u1', 'org-revoked')
    expect(active?.id).toBe('org-first')
    expect(h.userUpdates).toContainEqual({
      where: { id: 'u1' },
      data: { currentOrganizationId: 'org-first' },
    })
  })

  it('returns null when the user has no organizations', async () => {
    expect(await resolveActiveOrganization('u1')).toBeNull()
  })
})

describe('createOrganizationWithOwner', () => {
  beforeEach(() => {
    h.transactionTx = {
      organization: {
        create: vi.fn(async () => ({
          id: 'org-new',
          name: 'E2E Org',
          slug: 'e2e-org-ab12cd',
          workspaceType: 'AGENCY_WORKSPACE',
        })),
      },
      user: { update: vi.fn(async () => undefined) },
      auditLog: { create: vi.fn(async () => undefined) },
    }
  })

  it('creates the organization with an OWNER membership and audit event', async () => {
    const created = await createOrganizationWithOwner({
      userId: 'u9',
      name: 'E2E Org',
      workspaceType: 'AGENCY_WORKSPACE',
    })
    expect(created.role).toBe('OWNER')
    expect(created.name).toBe('E2E Org')
    const tx = h.transactionTx!
    expect(tx.organization.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'E2E Org',
          createdById: 'u9',
          memberships: { create: { userId: 'u9', role: 'OWNER' } },
        }),
      }),
    )
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'ORGANIZATION_CREATED' }),
      }),
    )
    expect(prismaAuth.$transaction).toHaveBeenCalledOnce()
  })

  it('produces a unique slug containing a random suffix', async () => {
    await createOrganizationWithOwner({
      userId: 'u9',
      name: 'Uniqueness Check!',
      workspaceType: 'GUARDIAN_PORTAL',
    })
    const arg = h.transactionTx!.organization.create.mock.calls[0]![0] as {
      data: { slug: string }
    }
    expect(arg.data.slug).toMatch(/^uniqueness-check-[0-9a-f]{6}$/)
  })
})

function memberOrg(id: string, name: string) {
  return {
    userId: 'u1',
    role: 'MEMBER',
    organization: { id, name, slug: name.toLowerCase(), workspaceType: 'ATHLETE_STUDIO' },
  }
}
