import { NextResponse } from 'next/server'
import { mkdir, readFile, readdir, writeFile } from 'fs/promises'
import path from 'path'
import { buildClientFolderName } from '@/lib/clientDownloads'
import type { AppointmentSelection } from '@/types'

export const runtime = 'nodejs'

// Files live outside /public so they are never served statically.
// Actual file access goes through /api/client-downloads/file/[...path].
const CLIENT_DOWNLOADS_DIR = path.join(process.cwd(), 'uploads', 'client-downloads')

export async function GET(request: Request) {
  try {
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

    if (!entry) {
      return NextResponse.json({ success: true, found: false })
    }

    return NextResponse.json({ success: true, found: true, ...entry })
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
    const body = await request.json() as {
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

    const folderName = buildClientFolderName(lastName, firstName)
    const targetDir = path.join(CLIENT_DOWNLOADS_DIR, folderName)

    await mkdir(targetDir, { recursive: true })

    const metadata = {
      firstName,
      lastName,
      email,
      password,
      orderId,
      folderName,
      createdAt,
      unlockAt,
      appointment,
    }

    await writeFile(
      path.join(targetDir, 'metadata.json'),
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

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (folder && entry.name !== folder) continue

    const folderPath = path.join(CLIENT_DOWNLOADS_DIR, entry.name)
    const metadataPath = path.join(folderPath, 'metadata.json')

    let metadata: {
      firstName?: string
      lastName?: string
      email?: string
      password?: string
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
      folderName: entry.name,
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
