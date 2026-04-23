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
