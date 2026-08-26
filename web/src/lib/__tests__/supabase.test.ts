import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => {
  const rowsByTable = new Map<string, Array<Record<string, unknown>>>()
  const queries: Array<{ table: string; args: Record<string, unknown> }> = []
  function makeTx() {
    return {
      opportunity: { findMany: record('opportunities') },
      deal: { findMany: record('deals') },
      organization: { findMany: record('organizations') },
    }
  }
  function record(table: string) {
    return vi.fn(async (args: Record<string, unknown>) => {
      queries.push({ table, args })
      return rowsByTable.get(table) ?? []
    })
  }
  return { rowsByTable, queries, makeTx }
})

vi.mock('../db', () => ({
  withUser: vi.fn((_userId: string, fn: (tx: never) => Promise<unknown>) =>
    fn(h.makeTx() as never),
  ),
  withOrgContext: vi.fn(
    (_userId: string, _organizationId: string, fn: (tx: never) => Promise<unknown>) =>
      fn(h.makeTx() as never),
  ),
}))

import { DataError } from '../supabase/errors'
import { createServerDataClient } from '../supabase/server'

beforeEach(() => {
  h.rowsByTable.clear()
  h.queries.length = 0
})

describe('createServerDataClient().from()', () => {
  const client = createServerDataClient({ userId: 'u1' })

  it('runs unscoped queries through withUser and returns rows', async () => {
    h.rowsByTable.set('opportunities', [{ id: 'o1' }, { id: 'o2' }])
    const rows = await client.from<{ id: string }>('opportunities').select()
    expect(rows.map((r) => r.id)).toEqual(['o1', 'o2'])
    expect(h.queries).toEqual([
      { table: 'opportunities', args: { where: {}, orderBy: undefined, take: undefined } },
    ])
  })

  it('composes eq predicates into a where clause', async () => {
    await client.from('deals').eq('brandName', 'Apex').eq('stage', 'signed').select()
    expect(h.queries[0]?.args.where).toEqual({
      AND: [{ brandName: 'Apex' }, { stage: 'signed' }],
    })
  })

  it('passes order direction and limit through', async () => {
    await client.from('opportunities').order('createdAt', { ascending: false }).limit(5).select()
    expect(h.queries[0]?.args.orderBy).toEqual({ createdAt: 'desc' })
    expect(h.queries[0]?.args.take).toBe(5)
  })

  it('routes through the org context when one is supplied', async () => {
    const scoped = createServerDataClient({ userId: 'u1', organizationId: 'org-9' })
    h.rowsByTable.set('organizations', [{ id: 'org-9' }])
    const rows = await scoped.from('organizations').eq('id', 'org-9').select()
    expect(rows).toHaveLength(1)
  })

  it('single() returns PGRST116 error when zero or multiple rows match', async () => {
    const empty = await client.from('deals').eq('id', 'gone').single()
    expect(empty.data).toBeNull()
    expect((empty.error as DataError).code).toBe('PGRST116')

    h.rowsByTable.set('deals', [{ id: 'a' }, { id: 'b' }])
    const many = await client.from('deals').select().single()
    expect((many.error as DataError).code).toBe('PGRST116')
  })

  it('maybeSingle() tolerates an empty result', async () => {
    const result = await client.from('opportunities').maybeSingle()
    expect(result.data).toBeNull()
    expect(result.error).toBeNull()
  })
})
