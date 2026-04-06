import { NextResponse } from 'next/server'
import { readFile, readdir } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

const CLIENT_DOWNLOADS_DIR = path.join(process.cwd(), 'public', 'client-downloads')

export async function POST(request: Request) {
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
  const entries = await readdir(CLIENT_DOWNLOADS_DIR, { withFileTypes: true })

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
      if ((metadata.password || '').trim() !== password) continue

      return {
        id: entry.name,
        name: `${metadata.firstName || ''} ${metadata.lastName || ''}`.trim() || entry.name,
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
