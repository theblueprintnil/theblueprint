import { PrismaClient, Prisma } from '@prisma/client'
import { validateEnv } from './env'

const globalForDb = globalThis as unknown as {
  prismaAuth?: PrismaClient
  prismaApp?: PrismaClient
  envValidated?: boolean
}

function ensureEnv(): void {
  if (!globalForDb.envValidated) {
    validateEnv()
    globalForDb.envValidated = true
  }
}

export const prismaAuth =
  globalForDb.prismaAuth ??
  (() => {
    ensureEnv()
    const client = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
    globalForDb.prismaAuth = client
    return client
  })()

function appDatabaseUrl(): string {
  const url = process.env.DATABASE_URL_APP
  if (!url) {
    throw new Error('DATABASE_URL_APP is not set. Configure the app_user connection in web/.env.')
  }
  return url
}

function appPrisma(): PrismaClient {
  const prismaApp =
    globalForDb.prismaApp ??
    new PrismaClient({
      datasources: { db: { url: appDatabaseUrl() } },
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
  globalForDb.prismaApp = prismaApp
  return prismaApp
}

interface ScopedConfig {
  key: string
  value: string
}

async function runScoped<T>(
  configs: ScopedConfig[],
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  ensureEnv()
  const prismaApp = appPrisma()
  return prismaApp.$transaction(async (tx) => {
    for (const config of configs) {
      await tx.$executeRawUnsafe(`SELECT set_config('${config.key}', $1, true)`, config.value)
    }
    return fn(tx)
  })
}

export function withUser<T>(
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return runScoped([{ key: 'app.current_user_id', value: userId }], fn)
}

export function withOrgContext<T>(
  userId: string,
  organizationId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return runScoped(
    [
      { key: 'app.current_user_id', value: userId },
      { key: 'app.current_org_id', value: organizationId },
    ],
    fn,
  )
}
