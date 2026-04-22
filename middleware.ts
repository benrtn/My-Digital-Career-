/**
 * Global security-headers middleware.
 *
 * Applies to all routes except Next.js internals and static assets.
 * Keep this file minimal — heavy logic belongs in route handlers.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SECURITY_HEADERS: Record<string, string> = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(self)',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-DNS-Prefetch-Control': 'on',
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value)
  }

  // Basic same-origin CSRF guard for mutating API calls.
  const method = request.method.toUpperCase()
  const isMutation = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'
  const isApi = request.nextUrl.pathname.startsWith('/api/')

  if (isMutation && isApi) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    if (origin && host) {
      try {
        const originHost = new URL(origin).host
        if (originHost !== host) {
          return NextResponse.json(
            { success: false, error: 'Cross-origin request blocked' },
            { status: 403 }
          )
        }
      } catch {
        // malformed origin — block
        return NextResponse.json(
          { success: false, error: 'Invalid origin' },
          { status: 403 }
        )
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    // All paths except Next internals & static assets
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|gif|svg|ico|css|js|woff2?)).*)',
  ],
}
