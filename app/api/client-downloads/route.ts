/**
 * GET  /api/client-downloads?email=xxx — lookup client folder
 * POST /api/client-downloads — create client folder with hashed password
 *
 * SECURITY: Passwords are hashed with bcrypt before being stored in a private metadata.json.
 * The plaintext password is NEVER written to disk or into /public.
 */

import { NextResponse } from 'next/server'
import { mkdir, readFile, readdir, writeFile } from 'fs/promises'
import path from 'path'
import { buildClientFolderName } from '@/lib/clientDownloads'
import { hashPassword } from '@/lib/auth'
import { getAdminSessionFromRequest, getClientSessionFromRequest } from '@/lib/session.server'
import type { AppointmentSelection } from '@/types'

export const runtime = 'nodejs'

// Files live outside /public so they are never served statically.
// Actual file access goes through /api/client-downloads/file/[...path].
const CLIENT_DOWNLOADS_DIR = path.join(process.cwd(), 'uploads', 'client-downloads')

export async function GET(request: Request) {
  try {
    const adminSession = await getAdminSessionFromRequest(request)
    const clientSession = adminSession ? null : await getClientSessionFromRequest(request)

    if (!adminSession && !clientSession) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')?.trim().toLowerCase()
    const folder = searchParams.get('folder')?.trim()

    if (!email && !folder) {
      return NextResponse.json(
        { success: false, error: 'Missing lookup parameter' },
        { status: 400 }
      )
    }

    const entry = await findClientFolder({ email, folder })
    const requestedEmail = email || entry?.clientEmail || null

    if (!adminSession && clientSession && requestedEmail && requestedEmail !== clientSession.sub) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    if (!entry) {
      return NextResponse.json({ success: true, found: false })
    }

    const { clientEmail, ...publicEntry } = entry

    return NextResponse.json({ success: true, found: true, ...publicEntry })
  } catch (error) {
    console.error('[client-downloads] Folder lookup failed:', error)
    return NextResponse.json(
      { success: false, error: 'Folder lookup failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Only admins or the authenticated client themselves may create a folder.
    const adminSession = await getAdminSessionFromRequest(request)
    const clientSession = adminSession ? null : await getClientSessionFromRequest(request)

    if (!adminSession && !clientSession) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = (await request.json()) as {
      firstName?: string
      lastName?: string
      email?: string
      password?: string
      orderId?: string
      skipWaitingPeriod?: boolean
      appointment?: AppointmentSelection | null
    }

    const firstName = body.firstName?.trim() ?? ''
    const lastName = body.lastName?.trim() ?? ''
    const email = body.email?.trim() ?? ''
    const password = body.password?.trim() ?? ''
    const orderId = body.orderId?.trim() ?? ''
    const appointment = body.appointment ?? null
    const createdAt = new Date().toISOString()
    const unlockAt = body.skipWaitingPeriod
      ? createdAt
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing client identity' },
        { status: 400 }
      )
    }

    // A client session may only create a folder for its own email.
    if (!adminSession && clientSession && email.toLowerCase() !== clientSession.sub.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const folderName = buildClientFolderName(lastName, firstName)
    const publicDir = path.join(CLIENT_DOWNLOADS_PUBLIC_DIR, folderName)
    const privateDir = path.join(CLIENT_DOWNLOADS_PRIVATE_DIR, folderName)

    await Promise.all([
      mkdir(publicDir, { recursive: true }),
      mkdir(privateDir, { recursive: true }),
    ])

    // Hash the password — NEVER store plaintext
    const passwordHash = password ? await hashPassword(password) : ''

    const metadata = {
      firstName,
      lastName,
      email,
      passwordHash, // bcrypt hash, NOT plaintext
      orderId,
      folderName,
      createdAt,
      unlockAt,
      appointment,
    }

    await writeFile(
      path.join(privateDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf8'
    )

    return NextResponse.json({
      success: true,
      folderName,
      folderPath: `/api/client-downloads/file/${folderName}/`,
      createdAt,
      unlockAt,
      appointment,
    })
  } catch (error) {
    console.error('[client-downloads] Folder creation failed:', error)
    return NextResponse.json(
      { success: false, error: 'Folder creation failed' },
      { status: 500 }
    )
  }
}

async function findClientFolder({
  email,
  folder,
}: {
  email?: string
  folder?: string
}) {
  let entries
  try {
    entries = await readdir(CLIENT_DOWNLOADS_DIR, { withFileTypes: true })
  } catch {
    // Directory doesn't exist yet
    return null
  }

  for (const entryName of dirEntries) {
    if (folder && entryName !== folder) continue

    const folderPath = path.join(CLIENT_DOWNLOADS_PUBLIC_DIR, entryName)

    // Check if it's a directory
    try {
      const stat = await import('fs/promises').then((m) => m.stat(folderPath))
      if (!stat.isDirectory()) continue
    } catch {
      continue
    }
    const metadataPath = path.join(CLIENT_DOWNLOADS_PRIVATE_DIR, entryName, 'metadata.json')

    let metadata: {
      firstName?: string
      lastName?: string
      email?: string
      orderId?: string
      createdAt?: string
      unlockAt?: string
      folderName?: string
      appointment?: AppointmentSelection | null
    } | null = null

    try {
      const raw = await readFile(metadataPath, 'utf8')
      metadata = JSON.parse(raw)
    } catch {
      metadata = null
    }

    if (email && metadata?.email?.trim().toLowerCase() !== email) {
      continue
    }

    const files = await readdir(folderPath)
    const zipFile = files.find((file) => file.toLowerCase().endsWith('.zip'))
    const htmlFile = files.find((file) => {
      const lower = file.toLowerCase()
      return lower === 'index.html' || lower.endsWith('.html')
    })
    const previewImage = files.find((file) => /\.(webp|png|jpe?g|gif)$/i.test(file))

    const createdAt = metadata?.createdAt ?? null
    const unlockAt = metadata?.unlockAt ?? null
    const remainingMs = unlockAt ? Math.max(new Date(unlockAt).getTime() - Date.now(), 0) : 0

    // Return API URLs — the caller must append auth params before use
    return {
      folderName: entryName,
      clientEmail: metadata?.email?.trim().toLowerCase() ?? null,
      createdAt,
      unlockAt,
      remainingMs,
      zipUrl: zipFile ? `/api/client-downloads/file/${entry.name}/${zipFile}` : null,
      previewUrl: htmlFile ? `/api/client-downloads/file/${entry.name}/${htmlFile}` : null,
      previewImageUrl: previewImage ? `/api/client-downloads/file/${entry.name}/${previewImage}` : null,
      hasZip: Boolean(zipFile),
      hasPreview: Boolean(htmlFile),
      readyAt: remainingMs === 0,
      orderId: metadata?.orderId ?? null,
      appointment: metadata?.appointment ?? null,
    }
  }

  return null
}
