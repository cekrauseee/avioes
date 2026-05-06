import { getSessionCookie } from 'better-auth/cookies'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next()

  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`
  const url = request.nextUrl.clone()
  url.pathname = '/auth'
  url.search = `?next=${encodeURIComponent(next)}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/', '/diary', '/scoreboard', '/settings', '/settings/:path*', '/groups', '/groups/:path*', '/world']
}
