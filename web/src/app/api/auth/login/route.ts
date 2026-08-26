import { NextResponse } from 'next/server'
import { compare as bcryptCompare } from 'bcryptjs'
import { prismaAuth } from '@/lib/db'
import {
  SESSION_COOKIE,
  generateSessionToken,
  hashToken,
  normalizeEmail,
  sessionCookieOptions,
  sessionExpiry,
} from '@/lib/auth'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string
    password?: string
  } | null
  if (!body?.email || !body?.password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }
  const email = normalizeEmail(body.email)
  const user = await prismaAuth.user.findUnique({ where: { email } })
  const passwordOk = user ? await bcryptCompare(body.password, user.passwordHash) : false
  if (!user || !passwordOk) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }
  const token = generateSessionToken()
  const expiresAt = sessionExpiry()
  await prismaAuth.session.create({
    data: { tokenHash: hashToken(token), userId: user.id, expiresAt },
  })
  const response = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt))
  return response
}
