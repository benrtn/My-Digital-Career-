import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * Server-side admin authentication.
 * Credentials are read from server-only env vars (no NEXT_PUBLIC_ prefix)
 * so they are never exposed in the client-side JavaScript bundle.
 */
export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    const adminEmail = process.env.ADMIN_EMAIL || ''
    const adminPassword = process.env.ADMIN_PASSWORD || ''
    const adminSecretKey = process.env.ADMIN_SECRET_KEY || ''

    if (!adminEmail || !adminPassword) {
      return NextResponse.json(
        { success: false, error: 'Admin credentials not configured' },
        { status: 500 }
      )
    }

    if (
      email?.trim().toLowerCase() === adminEmail.toLowerCase() &&
      password === adminPassword
    ) {
      return NextResponse.json({
        success: true,
        secretKey: adminSecretKey,
      })
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
