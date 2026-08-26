import { NextResponse } from 'next/server'
import { hash as bcryptHash } from 'bcryptjs'
import { prismaAuth } from '@/lib/db'
import {
  SESSION_COOKIE,
  generateSessionToken,
  hashToken,
  normalizeEmail,
  sessionCookieOptions,
  sessionExpiry,
  validateRegisterInput,
} from '@/lib/auth'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string
    name?: string
    password?: string
  } | null
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const invalid = validateRegisterInput(body)
  if (invalid) {
    return NextResponse.json({ error: invalid }, { status: 400 })
  }
  const email = normalizeEmail(body.email ?? '')
  const name = (body.name ?? '').trim()
  const existing = await prismaAuth.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: 'An account with this email already exists.' },
      { status: 409 },
    )
  }
  const passwordHash = await bcryptHash(body.password ?? '', 10)
  const token = generateSessionToken()
  const expiresAt = sessionExpiry()
  const user = await prismaAuth.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        sessions: { create: { tokenHash: hashToken(token), expiresAt } },
      },
    })
    return created
  })
  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt))
  return response
}
