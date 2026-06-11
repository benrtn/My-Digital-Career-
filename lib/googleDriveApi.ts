import { google } from 'googleapis'
import { Readable } from 'stream'

function getDriveAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return null

  try {
    const credentials = JSON.parse(raw) as { client_email: string; private_key: string }
    return new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    })
  } catch (error) {
    console.error('[Drive] Failed to parse service account JSON:', error)
    return null
  }
}

export function isDriveConfigured(): boolean {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim())
}

export async function createClientFolder(
  folderName: string
): Promise<{ id: string; url: string } | null> {
  const auth = getDriveAuth()
  if (!auth) return null

  const drive = google.drive({ version: 'v3', auth })
  const parentId = process.env.GOOGLE_DRIVE_CLIENTS_FOLDER_ID?.trim()

  try {
    const res = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
      },
      fields: 'id,webViewLink',
    })

    const id = res.data.id
    const url = res.data.webViewLink

    if (!id || !url) return null
    return { id, url }
  } catch (error) {
    console.error('[Drive] createClientFolder failed:', error)
    return null
  }
}

/**
 * Finds the client's Drive folder by order ID.
 * Folders are created as "<Nom> <Prénom> — <orderId>" (see /api/questionnaire),
 * so the order ID is a reliable, unique lookup key.
 */
export async function findClientFolderByOrderId(
  orderId: string
): Promise<{ id: string; name: string } | null> {
  const auth = getDriveAuth()
  if (!auth || !orderId.trim()) return null

  const drive = google.drive({ version: 'v3', auth })
  const parentId = process.env.GOOGLE_DRIVE_CLIENTS_FOLDER_ID?.trim()
  const safeOrderId = orderId.trim().replace(/['\\]/g, '')

  try {
    const res = await drive.files.list({
      q: [
        `mimeType='application/vnd.google-apps.folder'`,
        `name contains '${safeOrderId}'`,
        `trashed=false`,
        ...(parentId ? [`'${parentId}' in parents`] : []),
      ].join(' and '),
      fields: 'files(id,name)',
      pageSize: 5,
    })

    const folder = res.data.files?.[0]
    return folder?.id ? { id: folder.id, name: folder.name ?? '' } : null
  } catch (error) {
    console.error('[Drive] findClientFolderByOrderId failed:', error)
    return null
  }
}

/**
 * Finds the delivered e-CV archive (.zip) in a client folder.
 * The admin simply drops the final ZIP into the client's Drive folder.
 */
export async function findDeliverableZip(
  folderId: string
): Promise<{ id: string; name: string; size: number } | null> {
  const auth = getDriveAuth()
  if (!auth) return null

  const drive = google.drive({ version: 'v3', auth })

  try {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,size,mimeType,modifiedTime)',
      orderBy: 'modifiedTime desc',
      pageSize: 50,
    })

    const zip = (res.data.files ?? []).find((file) =>
      (file.name ?? '').toLowerCase().endsWith('.zip')
    )

    return zip?.id
      ? { id: zip.id, name: zip.name ?? 'e-cv.zip', size: Number(zip.size ?? 0) }
      : null
  } catch (error) {
    console.error('[Drive] findDeliverableZip failed:', error)
    return null
  }
}

/** Downloads a Drive file's content (used to stream the delivered ZIP). */
export async function downloadDriveFile(
  fileId: string
): Promise<{ data: Buffer; name: string; mimeType: string } | null> {
  const auth = getDriveAuth()
  if (!auth) return null

  const drive = google.drive({ version: 'v3', auth })

  try {
    const meta = await drive.files.get({
      fileId,
      fields: 'name,mimeType,parents,trashed',
    })

    if (meta.data.trashed) return null

    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    )

    return {
      data: Buffer.from(res.data as ArrayBuffer),
      name: meta.data.name ?? 'e-cv.zip',
      mimeType: meta.data.mimeType ?? 'application/zip',
    }
  } catch (error) {
    console.error('[Drive] downloadDriveFile failed:', error)
    return null
  }
}

/** Returns the parent folder IDs of a Drive file (ownership checks). */
export async function getDriveFileParents(fileId: string): Promise<string[]> {
  const auth = getDriveAuth()
  if (!auth) return []

  const drive = google.drive({ version: 'v3', auth })

  try {
    const res = await drive.files.get({ fileId, fields: 'parents' })
    return res.data.parents ?? []
  } catch (error) {
    console.error('[Drive] getDriveFileParents failed:', error)
    return []
  }
}

export async function uploadFileToDrive(
  folderId: string,
  name: string,
  mimeType: string,
  base64: string
): Promise<string | null> {
  const auth = getDriveAuth()
  if (!auth) return null

  const drive = google.drive({ version: 'v3', auth })

  try {
    const buffer = Buffer.from(base64, 'base64')
    const stream = Readable.from(buffer)

    const res = await drive.files.create({
      requestBody: {
        name,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: 'id,webViewLink',
    })

    return res.data.webViewLink ?? null
  } catch (error) {
    console.error(`[Drive] uploadFileToDrive "${name}" failed:`, error)
    return null
  }
}
