import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_COOKIE = 'blueprint_session'

export function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/app/:path*'],
}
