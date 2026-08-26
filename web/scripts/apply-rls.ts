import { readFileSync } from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

async function ensureAppRole(): Promise<void> {
  const password = process.env.APP_DB_PASSWORD
  if (!password) {
    throw new Error('APP_DB_PASSWORD is not set. Add it to web/.env before applying RLS.')
  }
  const existing = await prisma.$queryRaw<{ rolname: string }[]>`
    SELECT rolname FROM pg_roles WHERE rolname = 'app_user'
  `
  if (existing.length === 0) {
    await prisma.$executeRawUnsafe(`CREATE ROLE app_user LOGIN PASSWORD ${sqlLiteral(password)}`)
    console.log('created role app_user')
  } else {
    await prisma.$executeRawUnsafe(`ALTER ROLE app_user LOGIN PASSWORD ${sqlLiteral(password)}`)
    console.log('role app_user already exists, password refreshed')
  }
}

async function applyPolicies(): Promise<void> {
  const file = path.join(process.cwd(), 'prisma', 'rls.sql')
  const statements = readFileSync(file, 'utf8')
    .replace(/--[^\n]*/g, '')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0)
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement)
  }
  console.log(`applied ${statements.length} RLS statements from prisma/rls.sql`)
}

async function main(): Promise<void> {
  await ensureAppRole()
  await applyPolicies()
  console.log('RLS bootstrap complete')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
