import { NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export const runtime = 'nodejs'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads', 'client-downloads')

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  const map: Record<string, string> = {
    '.zip': 'application/zip',
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  }
  return map[ext] ?? 'application/octet-stream'
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params

  if (!segments || segments.length < 2) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const folder = segments[0]
  const filename = segments.slice(1).join('/')

  // Block metadata access
  if (filename.toLowerCase() === 'metadata.json') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Prevent path traversal
  const resolvedFolder = path.resolve(UPLOADS_DIR, folder)
  const resolvedFile = path.resolve(resolvedFolder, filename)
  if (!resolvedFolder.startsWith(UPLOADS_DIR) || !resolvedFile.startsWith(resolvedFolder + path.sep)) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  // Auth: adminKey OR client email+password
  const { searchParams } = new URL(request.url)
  const adminKey = searchParams.get('adminKey') ?? ''
  const clientEmail = searchParams.get('email')?.trim().toLowerCase() ?? ''
  const clientPassword = searchParams.get('password')?.trim() ?? ''

  const isAdmin = adminKey.length > 0 && adminKey === process.env.ADMIN_SECRET_KEY

  let isClient = false
  if (!isAdmin && clientEmail && clientPassword) {
    try {
      const metaPath = path.join(UPLOADS_DIR, folder, 'metadata.json')
      const raw = await readFile(metaPath, 'utf8')
      const meta = JSON.parse(raw) as { email?: string; password?: string }
      isClient =
        meta.email?.trim().toLowerCase() === clientEmail &&
        (meta.password ?? '').trim() === clientPassword
    } catch {
      isClient = false
    }
  }

  if (!isAdmin && !isClient) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  if (!existsSync(resolvedFile)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  try {
    const fileStat = await stat(resolvedFile)
    const data = await readFile(resolvedFile)
    const mimeType = getMimeType(filename)
    const isInline = mimeType.startsWith('text/html') || mimeType.startsWith('image/')

    return new NextResponse(data, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': String(fileStat.size),
        'Content-Disposition': isInline
          ? `inline; filename="${path.basename(filename)}"`
          : `attachment; filename="${path.basename(filename)}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[client-downloads/file] Serve failed:', err)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
