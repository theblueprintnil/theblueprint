import type { Prisma } from '@prisma/client'
import { withUser, withOrgContext } from '../db'
import { DataError } from './errors'

type SupportedTable = 'opportunities' | 'deals' | 'organizations'

interface ScopedRequest {
  userId: string
  organizationId?: string | null
}

type Predicate = [column: string, value: unknown]

export interface QueryResult<T> {
  data: T | null
  error: DataError | null
}

type OrderDirection = 'asc' | 'desc'

function whereFrom(predicates: Predicate[]): Record<string, unknown> {
  if (predicates.length === 0) return {}
  const conditions = predicates.map(([column, value]) => ({ [column]: value }))
  return conditions.length === 1 ? conditions[0] : { AND: conditions }
}

class TableQuery<Row extends Record<string, unknown>> {
  constructor(
    private readonly request: ScopedRequest,
    private readonly table: SupportedTable,
    private readonly predicates: Predicate[],
    private readonly orderByState?: { column: string; direction: OrderDirection },
    private readonly limitCount?: number,
  ) {}

  eq(column: string, value: unknown): TableQuery<Row> {
    return new TableQuery(
      this.request,
      this.table,
      [...this.predicates, [column, value]],
      this.orderByState,
      this.limitCount,
    )
  }

  order(column: string, options: { ascending?: boolean } = {}): TableQuery<Row> {
    return new TableQuery(
      this.request,
      this.table,
      this.predicates,
      { column, direction: options.ascending === false ? 'desc' : 'asc' },
      this.limitCount,
    )
  }

  limit(count: number): TableQuery<Row> {
    return new TableQuery(this.request, this.table, this.predicates, this.orderByState, count)
  }

  select(): TableQuery<Row> {
    return new TableQuery(
      this.request,
      this.table,
      this.predicates,
      this.orderByState,
      this.limitCount,
    )
  }

  private async fetchRows(): Promise<Row[]> {
    const where = whereFrom(this.predicates) as never
    const orderBy = this.orderByState
      ? ({ [this.orderByState.column]: this.orderByState.direction } as never)
      : undefined
    const take = this.limitCount ?? undefined

    const scoped = this.request.organizationId
      ? withOrgContext(this.request.userId, this.request.organizationId, (tx) =>
          this.runSelect(tx, where, orderBy, take),
        )
      : withUser(this.request.userId, (tx) => this.runSelect(tx, where, orderBy, take))

    const rows = (await scoped) as Row[]
    return rows.map((row) => Object.fromEntries(Object.entries(row))) as Row[]
  }

  private runSelect(
    tx: Prisma.TransactionClient,
    where: never,
    orderBy: never | undefined,
    take: number | undefined,
  ): Promise<unknown> {
    switch (this.table) {
      case 'opportunities':
        return tx.opportunity.findMany({ where, orderBy, take })
      case 'deals':
        return tx.deal.findMany({ where, orderBy, take })
      case 'organizations':
        return tx.organization.findMany({ where, orderBy, take })
    }
  }

  then<TResult1 = Row[], TResult2 = never>(
    onfulfilled?: ((value: Row[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.fetchRows().then(onfulfilled, onrejected)
  }

  async maybeSingle(): Promise<QueryResult<Row>> {
    const rows = await this.fetchRows()
    if (rows.length === 0) return { data: null, error: null }
    if (rows.length > 1) {
      return {
        data: null,
        error: new DataError('Multiple rows returned', { code: 'PGRST116' }),
      }
    }
    return { data: rows[0], error: null }
  }

  async single(): Promise<QueryResult<Row>> {
    const rows = await this.fetchRows()
    if (rows.length !== 1) {
      return {
        data: null,
        error: new DataError('Expected exactly one row', { code: 'PGRST116' }),
      }
    }
    return { data: rows[0], error: null }
  }
}

export interface ServerDataClient {
  from<Row extends Record<string, unknown>>(table: SupportedTable): TableQuery<Row>
}

export function createServerDataClient(request: ScopedRequest): ServerDataClient {
  return {
    from<Row extends Record<string, unknown>>(table: SupportedTable): TableQuery<Row> {
      return new TableQuery<Row>(request, table, [])
    },
  }
}
