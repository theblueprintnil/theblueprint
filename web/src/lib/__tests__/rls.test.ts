import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { withUser, prismaAuth } from '../db'

const dbTestsEnabled = process.env.VIBE_DB_TESTS === '1'
const d = dbTestsEnabled ? describe : describe.skip

const owner = new PrismaClient()

d('RLS tenant isolation (real Postgres)', () => {
  let userA: { id: string }
  let userB: { id: string }
  let opportunityA: { id: string }
  let opportunityB: { id: string }

  beforeAll(async () => {
    userA = await owner.user.create({
      data: { email: 'rls-a@test.local', name: 'RLS A', passwordHash: 'x', role: 'ATHLETE' },
    })
    userB = await owner.user.create({
      data: { email: 'rls-b@test.local', name: 'RLS B', passwordHash: 'x', role: 'ATHLETE' },
    })
    opportunityA = await owner.opportunity.create({
      data: {
        title: 'A row',
        brandName: 'Brand',
        payout: 100,
        sport: 's',
        location: 'l',
        deadline: 'd',
        description: 'x',
        ownerUserId: userA.id,
      },
    })
    opportunityB = await owner.opportunity.create({
      data: {
        title: 'B row',
        brandName: 'Brand',
        payout: 100,
        sport: 's',
        location: 'l',
        deadline: 'd',
        description: 'x',
        ownerUserId: userB.id,
      },
    })
  })

  afterAll(async () => {
    await owner.user.deleteMany({ where: { id: { in: [userA.id, userB.id] } } })
    await owner.$disconnect()
    await prismaAuth.$disconnect()
  })

  it('user A sees only their own rows', async () => {
    const rows = await withUser(userA.id, (tx) => tx.opportunity.findMany())
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.ownerUserId).toBe(userA.id)
    }
  })

  it('user A cannot read user B row by id', async () => {
    const row = await withUser(userA.id, (tx) =>
      tx.opportunity.findUnique({ where: { id: opportunityB.id } }),
    )
    expect(row).toBeNull()
  })

  it('user A cannot insert a row owned by user B', async () => {
    await expect(
      withUser(userA.id, (tx) =>
        tx.opportunity.create({
          data: {
            title: 'forged',
            brandName: 'Brand',
            payout: 1,
            sport: 's',
            location: 'l',
            deadline: 'd',
            description: 'x',
            ownerUserId: userB.id,
          },
        }),
      ),
    ).rejects.toThrow()
  })

  it('queries without identity fail closed (no rows)', async () => {
    const prismaApp = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL_APP! } },
    })
    try {
      const rows = await prismaApp.opportunity.findMany()
      expect(rows).toEqual([])
    } finally {
      await prismaApp.$disconnect()
    }
  })
})
