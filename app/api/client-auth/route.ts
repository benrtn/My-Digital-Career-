import { NextResponse } from 'next/server'
import { readFile, readdir } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

const CLIENT_DOWNLOADS_DIR = path.join(process.cwd(), 'uploads', 'client-downloads')

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

// ---------------------------------------------------------------------------
// Route handler
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
    const body = await request.json() as {
      email?: string
      password?: string
    }

    const email = body.email?.trim().toLowerCase() || ''
    const password = body.password?.trim() || ''

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing credentials' },
        { status: 400 }
      )
    }

    const account = await findClientAccount(email, password)
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      account,
    })
  } catch (error) {
    console.error('[client-auth] Auth failed:', error)
    return NextResponse.json(
      { success: false, error: 'Client auth failed' },
      { status: 500 }
    )
  }
}

async function findClientAccount(email: string, password: string) {
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
        password?: string
      }

      if (metadata.email?.trim().toLowerCase() !== email) continue
      if ((metadata.password ?? '').trim() !== password) continue

      return {
        id: entry.name,
        name: `${metadata.firstName ?? ''} ${metadata.lastName ?? ''}`.trim() || entry.name,
        email,
        password,
        siteUrl: '',
        previewImagePath: '',
        downloadPath: '',
      }
    } catch {
      continue
    }
  }

  return null
}
