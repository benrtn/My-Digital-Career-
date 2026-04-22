import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import bcrypt from 'bcryptjs'
import { ADMIN_SESSION_COOKIE, createAdminToken, verifyAdminToken } from '@/lib/auth'

export const runtime = 'nodejs'

const adminSessionCookie = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 12,
}

// ── Rate limiting (in-memory; best-effort on serverless) ──
const failedAttempts = new Map<string, { count: number; firstAt: number }>()
const RATE_WINDOW_MS = 15 * 60 * 1000 // 15 min
const MAX_ATTEMPTS = 5

function clientKey(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  return fwd?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}

function checkRate(key: string): boolean {
  const entry = failedAttempts.get(key)
  const now = Date.now()
  if (!entry || now - entry.firstAt > RATE_WINDOW_MS) {
    failedAttempts.set(key, { count: 0, firstAt: now })
    return true
  }
  return entry.count < MAX_ATTEMPTS
}

function recordFailure(key: string) {
  const entry = failedAttempts.get(key) ?? { count: 0, firstAt: Date.now() }
  entry.count += 1
  failedAttempts.set(key, entry)
}

function resetFailures(key: string) {
  failedAttempts.delete(key)
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) {
    // Still compare same-length buffers to avoid length-based timing leak.
    const dummy = Buffer.alloc(bufA.length)
    timingSafeEqual(bufA, dummy)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

function getCookieValue(request: Request, name: string): string | null {
  const value = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1)

  return value ? decodeURIComponent(value) : null
}

function clearAdminSession(response: NextResponse) {
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    ...adminSessionCookie,
    maxAge: 0,
  })
}

export async function GET(request: Request) {
  const token = getCookieValue(request, ADMIN_SESSION_COOKIE)
  if (!token) {
    return NextResponse.json({ success: true, authenticated: false })
  }

  const payload = await verifyAdminToken(token)
  if (!payload) {
    const response = NextResponse.json({ success: true, authenticated: false })
    clearAdminSession(response)
    return response
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    email: payload.sub,
  })
}

export async function POST(request: Request) {
  const ip = clientKey(request)
  if (!checkRate(ip)) {
    return NextResponse.json(
      { success: false, error: 'Trop de tentatives — réessayez plus tard' },
      { status: 429 }
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

    const submittedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    const submittedPassword = typeof password === 'string' ? password : ''

    const emailOk = timingSafeStringEqual(submittedEmail, adminEmail.toLowerCase())

    // Prefer bcrypt hash if provided; fall back to plaintext with timing-safe compare.
    let passwordOk = false
    if (adminPasswordHash) {
      try {
        passwordOk = await bcrypt.compare(submittedPassword, adminPasswordHash)
      } catch {
        passwordOk = false
      }
    } else {
      passwordOk = timingSafeStringEqual(submittedPassword, adminPassword)
    }

    if (emailOk && passwordOk) {
      resetFailures(ip)
      const token = await createAdminToken(adminEmail)
      const response = NextResponse.json({ success: true })
      response.cookies.set(ADMIN_SESSION_COOKIE, token, adminSessionCookie)
      return response
    }

    recordFailure(ip)
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
  clearAdminSession(response)
  return response
}
