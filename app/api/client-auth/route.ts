/**
 * GET    /api/client-auth — restore session from the HttpOnly cookie
 * POST   /api/client-auth — login (bcrypt check against Google Sheets "ID client")
 * DELETE /api/client-auth — logout
 *
 * Passwords are verified against the bcrypt hash stored in the
 * "🔒 Clé auth" column of the "ID client" tab. Legacy plaintext
 * values are rejected (see lib/auth.verifyPassword).
 * A signed JWT is stored in an HttpOnly cookie on success — the
 * password never leaves the server after login.
 */

import { NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import {
  CLIENT_SESSION_COOKIE,
  createClientToken,
  verifyClientToken,
  verifyPassword,
} from '@/lib/auth'
import { findClientByEmail } from '@/lib/googleSheetsApi'
import { isValidEmail } from '@/lib/utils'
import type { ClientSiteAccess } from '@/types'

export const runtime = 'nodejs'

const CLIENT_DOWNLOADS_DIR = path.join(process.cwd(), 'uploads', 'client-downloads')

const clientSessionCookie = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days — matches the JWT expiry
}

// ---------------------------------------------------------------------------
// Rate limiting: 10 attempts per IP per 15 minutes
// ---------------------------------------------------------------------------

const RATE_LIMIT_MAX = 10
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

function getCookieToken(request: Request): string | null {
  const value = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CLIENT_SESSION_COOKIE}=`))
    ?.slice(CLIENT_SESSION_COOKIE.length + 1)

  return value ? decodeURIComponent(value) : null
}

function buildAccount(data: {
  email: string
  name: string
  orderId?: string
}): ClientSiteAccess {
  return {
    id: data.orderId || data.email.split('@')[0],
    name: data.name,
    email: data.email,
    orderId: data.orderId,
    siteUrl: '',
    previewImagePath: '',
    downloadPath: '',
  }
}

// ---------------------------------------------------------------------------
// GET — session restore
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const token = getCookieToken(request)
  if (!token) {
    return NextResponse.json({ authenticated: false })
  }

  const payload = await verifyClientToken(token)
  if (!payload) {
    return NextResponse.json({ authenticated: false })
  }

  return NextResponse.json({
    authenticated: true,
    account: buildAccount({
      email: payload.sub,
      name: payload.name,
      orderId: payload.orderId,
    }),
  })
}

// ---------------------------------------------------------------------------
// POST — login
// ---------------------------------------------------------------------------

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
    const body = (await request.json()) as {
      email?: string
      password?: string
    }

    const email = body.email?.trim().toLowerCase() || ''
    const password = body.password?.trim() || ''

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email et mot de passe requis' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Email invalide' },
        { status: 400 }
      )
    }

    // Strategy 1: Google Sheets "ID client" tab (source of truth)
    const sheetsClient = await findClientByEmail(email)
    if (sheetsClient && sheetsClient.passwordHash) {
      const valid = await verifyPassword(password, sheetsClient.passwordHash)
      if (valid) {
        const name = `${sheetsClient.firstName} ${sheetsClient.lastName}`.trim() || email
        return respondWithSession({ email, name, orderId: sheetsClient.orderId })
      }
    }

    // Strategy 2: local metadata.json fallback (bcrypt hashes only)
    const localAccount = await findLocalAccount(email, password)
    if (localAccount) {
      return respondWithSession(localAccount)
    }

    return NextResponse.json(
      { success: false, error: 'Identifiants invalides' },
      { status: 401 }
    )
  } catch (error) {
    console.error('[client-auth] Auth failed:', error)
    return NextResponse.json(
      { success: false, error: 'Client auth failed' },
      { status: 500 }
    )
  }
}

async function respondWithSession(data: {
  email: string
  name: string
  orderId?: string
}) {
  const token = await createClientToken(data)
  const response = NextResponse.json({
    success: true,
    account: buildAccount(data),
  })
  response.cookies.set(CLIENT_SESSION_COOKIE, token, clientSessionCookie)
  return response
}

async function findLocalAccount(email: string, password: string) {
  let entries
  try {
    entries = await readdir(CLIENT_DOWNLOADS_DIR, { withFileTypes: true })
  } catch {
    return null
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    try {
      const raw = await readFile(path.join(CLIENT_DOWNLOADS_DIR, entry.name, 'metadata.json'), 'utf8')
      const metadata = JSON.parse(raw) as {
        firstName?: string
        lastName?: string
        email?: string
        passwordHash?: string
        orderId?: string
      }

      if (metadata.email?.trim().toLowerCase() !== email) continue
      if (!metadata.passwordHash) continue

      const valid = await verifyPassword(password, metadata.passwordHash)
      if (!valid) continue

      return {
        email,
        name: `${metadata.firstName ?? ''} ${metadata.lastName ?? ''}`.trim() || entry.name,
        orderId: metadata.orderId,
      }
    } catch {
      continue
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// DELETE — logout
// ---------------------------------------------------------------------------

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.set(CLIENT_SESSION_COOKIE, '', { ...clientSessionCookie, maxAge: 0 })
  return response
}
