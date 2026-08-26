import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prismaAuth } from '@/lib/db'
import { SESSION_COOKIE, hashToken } from '@/lib/auth'

export async function POST() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await prismaAuth.session
      .delete({ where: { tokenHash: hashToken(token) } })
      .catch(() => undefined)
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.delete(SESSION_COOKIE)
  return response
}
