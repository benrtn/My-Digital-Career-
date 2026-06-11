/**
 * GET    /api/admin-auth — restore admin session from the HttpOnly cookie
 * POST   /api/admin-auth — login (sets the admin session cookie)
 * DELETE /api/admin-auth — logout
 *
 * Credentials come from environment variables only:
 *   ADMIN_EMAIL + ADMIN_PASSWORD_HASH (bcrypt, recommended)
 *   or ADMIN_EMAIL + ADMIN_PASSWORD (plaintext fallback)
 *
 * The ADMIN_SECRET_KEY is never sent to the browser — all privileged
 * calls go through /api/admin/* routes that check the session cookie.
 */

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import {
  ADMIN_SESSION_COOKIE,
  createAdminToken,
  verifyAdminToken,
  verifyPassword,
} from '@/lib/auth'

export const runtime = 'nodejs'

const adminSessionCookie = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 12 * 60 * 60, // 12h — matches the JWT expiry
}

// ---------------------------------------------------------------------------
// Rate limiting: 5 attempts per IP per 15 minutes
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000

const rateMap = new Map<string, { count: number; resetAt: number }>()

function getClientIp(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const entry = rateMap.get(ip)

  if (!entry || now >= entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfterMs: 0 }
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfterMs: entry.resetAt - now }
  }

  entry.count++
  return { allowed: true, retryAfterMs: 0 }
}

// ---------------------------------------------------------------------------
// Constant-time string comparison to prevent timing attacks
// ---------------------------------------------------------------------------

function safeEquals(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a)
    const bBuf = Buffer.from(b)
    if (aBuf.length !== bBuf.length) {
      // Still run comparison to avoid timing leak on length
      timingSafeEqual(aBuf, aBuf)
      return false
    }
    return timingSafeEqual(aBuf, bBuf)
  } catch {
    return false
  }
}

function getCookieToken(request: Request): string | null {
  const value = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1)

  return value ? decodeURIComponent(value) : null
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const token = getCookieToken(request)
  if (!token) {
    return NextResponse.json({ authenticated: false })
  }

  const payload = await verifyAdminToken(token)
  return NextResponse.json({ authenticated: Boolean(payload) })
}

export async function POST(request: Request) {
  const ip = getClientIp(request)
  const { allowed, retryAfterMs } = checkRateLimit(ip)

  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many attempts. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil(retryAfterMs / 1000)) },
      }
    )
  }

  try {
    const { email, password } = await request.json()

    const adminEmail = process.env.ADMIN_EMAIL || ''
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH || ''
    const adminPassword = process.env.ADMIN_PASSWORD || ''

    if (!adminEmail || (!adminPasswordHash && !adminPassword)) {
      return NextResponse.json(
        { success: false, error: 'Admin credentials not configured' },
        { status: 500 }
      )
    }

    const emailMatch = safeEquals(
      (email?.trim() ?? '').toLowerCase(),
      adminEmail.toLowerCase()
    )

    const passwordMatch = adminPasswordHash
      ? await verifyPassword(password ?? '', adminPasswordHash)
      : safeEquals(password ?? '', adminPassword)

    if (emailMatch && passwordMatch) {
      const token = await createAdminToken(adminEmail)
      const response = NextResponse.json({ success: true })
      response.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookie)
      return response
    }

    return NextResponse.json(
      { success: false, error: 'Invalid credentials' },
      { status: 401 }
    )
  } catch {
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { ...adminSessionCookie, maxAge: 0 })
  return response
}
