import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LINKEDIN_URL = 'https://www.linkedin.com/in/your-profile'

export function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const isLocal =
    host.startsWith('localhost') || host.startsWith('127.0.0.1')
  const { pathname } = request.nextUrl

  if (!isLocal) {
    if (pathname === '/') {
      return NextResponse.redirect(LINKEDIN_URL, { status: 308 })
    }

    if (
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/preview') ||
      pathname.startsWith('/api/agent')
    ) {
      return new Response('Not Found', { status: 404 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
