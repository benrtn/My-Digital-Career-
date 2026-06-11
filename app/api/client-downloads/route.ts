import { NextResponse } from 'next/server'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { buildClientFolderName } from '@/lib/clientDownloads'
import { CLIENT_DOWNLOADS_DIR, findClientFolder } from '@/lib/clientDownloads.server'
import { hashPassword } from '@/lib/auth'
import type { AppointmentSelection } from '@/types'

export const runtime = 'nodejs'

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

    const entry = await findClientFolder({ email: email || undefined, folder: folder || undefined })

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

    // Only the bcrypt hash is persisted — never the plaintext password.
    const metadata = {
      firstName,
      lastName,
      email,
      passwordHash: password ? await hashPassword(password) : '',
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

