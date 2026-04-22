/**
 * GET    /api/client-auth
 * POST   /api/client-auth
 * DELETE /api/client-auth
 *
 * Secure client authentication.
 * - Checks bcrypt-hashed password from Google Sheets (ID client tab)
 * - Falls back to private local metadata.json files (also bcrypt-hashed)
 * - Stores a signed JWT token in an HttpOnly cookie on success
 *
 * MIGRATION NOTE: Legacy plaintext passwords are rejected.
 * Clients must be re-registered with hashed passwords.
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

export const runtime = 'nodejs'

const CLIENT_METADATA_DIR = path.join(process.cwd(), 'data', 'client-downloads')

const clientSessionCookie = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 7,
}

function clearClientSession(response: NextResponse) {
  response.cookies.set(CLIENT_SESSION_COOKIE, '', {
    ...clientSessionCookie,
    maxAge: 0,
  })
}

export async function GET(request: Request) {
  const token = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${CLIENT_SESSION_COOKIE}=`))
    ?.slice(CLIENT_SESSION_COOKIE.length + 1)

  if (!token) {
    return NextResponse.json({ success: true, authenticated: false })
  }

  const payload = await verifyClientToken(decodeURIComponent(token))
  if (!payload) {
    const response = NextResponse.json({ success: true, authenticated: false })
    clearClientSession(response)
    return response
  }

  return NextResponse.json({
    success: true,
    authenticated: true,
    account: {
      id: payload.orderId || payload.sub.split('@')[0],
      name: payload.name,
      email: payload.sub,
      orderId: payload.orderId,
      siteUrl: '',
      previewImagePath: '',
      downloadPath: '',
    },
  })
}

export async function POST(request: Request) {
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

    // Strategy 1: Check Google Sheets (ID client tab)
    const sheetsClient = await findClientByEmail(email)
    if (sheetsClient && sheetsClient.passwordHash) {
      const valid = await verifyPassword(password, sheetsClient.passwordHash)
      if (valid) {
        const name = `${sheetsClient.firstName} ${sheetsClient.lastName}`.trim()
        const token = await createClientToken({
          email,
          name,
          orderId: sheetsClient.orderId,
        })

        const response = NextResponse.json({
          success: true,
          account: {
            id: sheetsClient.orderId || email.split('@')[0],
            name,
            email,
            orderId: sheetsClient.orderId,
            siteUrl: '',
            previewImagePath: '',
            downloadPath: '',
          },
        })
        response.cookies.set(CLIENT_SESSION_COOKIE, token, clientSessionCookie)
        return response
      }
    }

    // Strategy 2: Check local metadata.json files
    const localAccount = await findLocalAccount(email, password)
    if (localAccount) {
      const token = await createClientToken({
        email,
        name: localAccount.name,
        orderId: localAccount.orderId,
      })

      const response = NextResponse.json({
        success: true,
        account: localAccount,
      })
      response.cookies.set(CLIENT_SESSION_COOKIE, token, clientSessionCookie)
      return response
    }

    // Both strategies failed
    return NextResponse.json(
      { success: false, error: 'Identifiants invalides' },
      { status: 401 }
    )
  } catch (error) {
    console.error('[client-auth] Auth failed:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur d\'authentification' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  clearClientSession(response)
  return response
}

async function findLocalAccount(email: string, password: string) {
  try {
    const entries = await readdir(CLIENT_METADATA_DIR, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue

      try {
        const raw = await readFile(
          path.join(CLIENT_METADATA_DIR, entry.name, 'metadata.json'),
          'utf8'
        )
        const metadata = JSON.parse(raw) as {
          firstName?: string
          lastName?: string
          email?: string
          passwordHash?: string
          orderId?: string
        }

        if (metadata.email?.trim().toLowerCase() !== email) continue

        // Only accept bcrypt hashes — reject plaintext passwords
        if (!metadata.passwordHash) continue

        const valid = await verifyPassword(password, metadata.passwordHash)
        if (!valid) continue

        return {
          id: entry.name,
          name: `${metadata.firstName || ''} ${metadata.lastName || ''}`.trim() || entry.name,
          email,
          orderId: metadata.orderId || '',
          siteUrl: '',
          previewImagePath: '',
          downloadPath: '',
        }
      } catch {
        continue
      }
    }
  } catch {
    // CLIENT_METADATA_DIR might not exist yet
  }

  return null
}
