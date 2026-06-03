// middleware.ts
// Next.js middleware — must live at the project root (not inside app/).
// Reads the Supabase session cookie on every request, then:
//   • Redirects unauthenticated users to /login for protected page routes   (Req 10.3, 1.8, 10.4)
//   • Returns 401 for protected API routes when no valid session is present (Req 1.7)
//   • Allows public routes (/login, /register, static assets) through unconditionally

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that never require authentication
const PUBLIC_ROUTES = ['/', '/login', '/register']

// URL prefixes that belong to Next.js internals / static assets and must always pass through
const ALWAYS_ALLOW_PREFIXES = [
  '/_next/',
  '/favicon.ico',
  '/manifest',
  '/icons/',
  '/sw.js',
  '/workbox-',
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))
}

function isAlwaysAllowed(pathname: string): boolean {
  return ALWAYS_ALLOW_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Let Next.js internals and static assets through immediately
  if (isAlwaysAllowed(pathname)) {
    return NextResponse.next()
  }

  // Public pages (/login, /register) are always accessible
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // For all other routes we need to validate the session.
  // We create a response object that middleware can write refreshed cookies into,
  // which keeps the Supabase session alive across requests.
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write cookies onto both the request (so downstream code can read them)
          // and the response (so the browser receives refreshed tokens)
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // getUser() validates the JWT with the Supabase Auth server; it also refreshes
  // an expired-but-still-refreshable token automatically (satisfying Req 1.8 / 10.4).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Protected API routes → 401 (Req 1.7)
    if (isApiRoute(pathname)) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized', message: 'A valid session is required.' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Protected page routes → redirect to /login (Req 10.3, responds within the same server RTT)
    const loginUrl = new URL('/login', request.url)
    // Preserve the originally requested path so the login page can redirect back after auth
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Session is valid — return the response with any refreshed session cookies attached
  return response
}

export const config = {
  /*
   * Match every path except:
   *  - Next.js internals (_next/static, _next/image)
   *  - Files with extensions (images, fonts, etc.)
   * This is the standard Supabase/Next.js middleware matcher pattern.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
