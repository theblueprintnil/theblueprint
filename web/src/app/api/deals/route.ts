import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { withUser } from '@/lib/db'
import { getSessionUser } from '@/lib/session'
import { mapDeal } from '@/lib/mappers'
import { DEAL_STAGES } from '@/lib/types'

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const stage = searchParams.get('stage')
  const empty = searchParams.get('empty') === '1'
  if (empty) {
    return NextResponse.json({ items: [] })
  }
  const where: Prisma.DealWhereInput = {}
  if (stage && (DEAL_STAGES as readonly string[]).includes(stage)) {
    where.stage = stage
  }
  const rows = await withUser(user.id, (tx) =>
    tx.deal.findMany({ where, orderBy: { updatedAt: 'desc' } }),
  )
  return NextResponse.json({ items: rows.map(mapDeal) })
}
