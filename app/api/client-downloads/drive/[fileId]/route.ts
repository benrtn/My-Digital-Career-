/**
 * GET /api/client-downloads/drive/[fileId]
 *
 * Streams the delivered e-CV ZIP from the client's Google Drive folder.
 * Auth: client session cookie (file must live in the folder matching the
 * client's order ID) or admin session cookie / adminKey.
 * The Drive file itself stays private — only the service account reads it.
 */

import { NextResponse } from 'next/server'
import {
  downloadDriveFile,
  findClientFolderByOrderId,
  getDriveFileParents,
} from '@/lib/googleDriveApi'
import { findLatestOrderByEmail } from '@/lib/googleSheetsApi'
import {
  getAdminSessionFromRequest,
  getClientSessionFromRequest,
} from '@/lib/session.server'

export const runtime = 'nodejs'

const FILE_ID_RE = /^[\w-]{10,100}$/

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params

  if (!FILE_ID_RE.test(fileId)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Admin: full access
  const { searchParams } = new URL(request.url)
  const adminKey = searchParams.get('adminKey') ?? ''
  let authorized =
    (adminKey.length > 0 && adminKey === process.env.ADMIN_SECRET_KEY) ||
    Boolean(await getAdminSessionFromRequest(request))

  // Client: the file must belong to the folder of their own order
  if (!authorized) {
    const session = await getClientSessionFromRequest(request)
    if (session) {
      let orderId = session.orderId || ''
      if (!orderId) {
        const order = await findLatestOrderByEmail(session.sub)
        orderId = order?.orderId || ''
      }

      if (orderId) {
        const folder = await findClientFolderByOrderId(orderId)
        if (folder) {
          const parents = await getDriveFileParents(fileId)
          authorized = parents.includes(folder.id)
        }
      }
    }
  }

  if (!authorized) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const file = await downloadDriveFile(fileId)
  if (!file) {
    return new NextResponse('Not Found', { status: 404 })
  }

  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      'Content-Type': file.mimeType || 'application/zip',
      'Content-Length': String(file.data.length),
      'Content-Disposition': `attachment; filename="${file.name.replace(/[^\w\-. ]/g, '_')}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
