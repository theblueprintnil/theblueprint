import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { prismaAuth, withOrgContext } from '../db'

const dbTestsEnabled = process.env.VIBE_DB_TESTS === '1'
const d = dbTestsEnabled ? describe : describe.skip

const owner = new PrismaClient()

d('RLS tenant isolation for tenant data model (real Postgres)', () => {
  let userA: { id: string }
  let userB: { id: string }
  let orgA: { id: string }
  let orgB: { id: string }
  let projectB: string

  beforeAll(async () => {
    userA = await owner.user.create({
      data: { email: 'tenant-a@test.local', name: 'Tenant A', passwordHash: 'x', role: 'ATHLETE' },
    })
    userB = await owner.user.create({
      data: { email: 'tenant-b@test.local', name: 'Tenant B', passwordHash: 'x', role: 'ATHLETE' },
    })

    orgA = await owner.organization.create({
      data: {
        name: 'Org A',
        slug: 'org-a-demo',
        workspaceType: 'ATHLETE_STUDIO',
        createdById: userA.id,
        memberships: { create: { userId: userA.id, role: 'OWNER' } },
        projects: { create: { name: 'A Project', slug: 'a-project', status: 'ACTIVE', ownerUserId: userA.id } },
        subscription: { create: { stripeCustomerId: 'cus_a', stripeSubscriptionId: 'sub_a', status: 'ACTIVE' } },
        entitlement: { create: { plan: 'STARTER', seatsLimit: 3, aiCreditsMonthly: 100 } },
        aiRuns: { create: { status: 'SUCCEEDED', model: 'gpt-4o' } },
        usageEvents: { create: { eventType: 'AI_CREDIT_CONSUMED' } },
        invitations: { create: { email: 'invite-a@test.local', tokenHash: 'tok-a', expiresAt: new Date() } },
      },
    })

    const createdB = await owner.organization.create({
      data: {
        name: 'Org B',
        slug: 'org-b-demo',
        workspaceType: 'AGENCY_WORKSPACE',
        createdById: userB.id,
        memberships: { create: { userId: userB.id, role: 'OWNER' } },
        projects: { create: { name: 'B Project', slug: 'b-project', status: 'ACTIVE', ownerUserId: userB.id } },
        subscription: { create: { stripeCustomerId: 'cus_b', stripeSubscriptionId: 'sub_b', status: 'ACTIVE' } },
        entitlement: { create: { plan: 'GROWTH', seatsLimit: 10, aiCreditsMonthly: 500 } },
      },
    })
    orgB = createdB
    projectB = (await owner.project.findFirst({ where: { organizationId: orgB.id } }))!.id
  })

  afterAll(async () => {
    await owner.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } })
    await owner.organization.deleteMany({ where: { id: { in: [orgA.id, orgB.id] } } })
    await owner.$disconnect()
    await prismaAuth.$disconnect()
  })

  it('user A (org A) sees only its own tenant rows', async () => {
    await withOrgContext(userA.id, orgA.id, async (tx) => {
      const projects = await tx.project.findMany()
      expect(projects.every((row) => row.organizationId === orgA.id)).toBe(true)
      const subs = await tx.subscription.findMany()
      expect(subs.every((row) => row.organizationId === orgA.id)).toBe(true)
      const ents = await tx.entitlement.findMany()
      expect(ents.every((row) => row.organizationId === orgA.id)).toBe(true)
      const runs = await tx.aiRun.findMany()
      expect(runs.every((row) => row.organizationId === orgA.id)).toBe(true)
    })
  })

  it('user A cannot read tenant B row by id', async () => {
    const row = await withOrgContext(userA.id, orgA.id, (tx) =>
      tx.project.findUnique({ where: { id: projectB } }),
    )
    expect(row).toBeNull()
  })

  it('user A cannot insert a row into tenant B', async () => {
    await expect(
      withOrgContext(userA.id, orgA.id, (tx) =>
        tx.project.create({
          data: { name: 'forged', slug: 'forged', status: 'ACTIVE', organizationId: orgB.id },
        }),
      ),
    ).rejects.toThrow()
  })

  it('queries without identity fail closed (no rows)', async () => {
    const prismaApp = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL_APP! } },
    })
    try {
      const rows = await prismaApp.project.findMany()
      expect(rows).toEqual([])
    } finally {
      await prismaApp.$disconnect()
    }
  })
})