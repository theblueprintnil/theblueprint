import { NextResponse } from 'next/server'
import type { Prisma, OpportunityStatus as DbOpportunityStatus } from '@prisma/client'
import { withUser } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { dbStatusFromUi, mapOpportunity } from '@/lib/mappers'
import type { OpportunityStatus } from '@/lib/types'

const VALID_STATUSES: OpportunityStatus[] = ['new', 'under_review', 'accepted', 'declined']

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const empty = searchParams.get('empty') === '1'
  if (empty) {
    return NextResponse.json({ items: [] })
  }
  const where: Prisma.OpportunityWhereInput = {}
  if (status && VALID_STATUSES.includes(status as OpportunityStatus)) {
    where.status = dbStatusFromUi(status as OpportunityStatus) as DbOpportunityStatus
  }
  const rows = await withUser(user.id, (tx) =>
    tx.opportunity.findMany({ where, orderBy: { createdAt: 'desc' } }),
  )
  return NextResponse.json({ items: rows.map(mapOpportunity) })
}
