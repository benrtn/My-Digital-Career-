import { NextResponse } from 'next/server'
import { appendQuestionnaireRow, isGoogleSheetsConfigured } from '@/lib/googleSheetsApi'
import { createClientFolder, uploadFileToDrive, isDriveConfigured } from '@/lib/googleDriveApi'
import { generateOrderId, formatDateFR } from '@/lib/orderUtils'

export const runtime = 'nodejs'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_EXTRA_FILES = 5

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const SAFE_FILENAME_RE = /^[\w\-. ()[\]]{1,200}$/
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/

interface UploadPayload {
  name?: unknown
  mimeType?: unknown
  base64?: unknown
}

interface ValidationError {
  field: string
  reason: string
}

function validateUpload(upload: UploadPayload | null | undefined, fieldName: string): ValidationError | null {
  if (!upload) return null

  const name = typeof upload.name === 'string' ? upload.name.trim() : ''
  const mimeType = typeof upload.mimeType === 'string' ? upload.mimeType.trim().toLowerCase() : ''
  const base64 = typeof upload.base64 === 'string' ? upload.base64 : ''

  if (!name) return { field: fieldName, reason: 'Missing filename' }
  if (!SAFE_FILENAME_RE.test(name)) return { field: fieldName, reason: `Unsafe filename: ${name}` }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return { field: fieldName, reason: `Unsupported file type: ${mimeType}` }
  if (!BASE64_RE.test(base64)) return { field: fieldName, reason: 'Invalid base64 data' }

  const approxBytes = Math.floor((base64.length * 3) / 4)
  if (approxBytes > MAX_FILE_SIZE_BYTES) {
    return { field: fieldName, reason: `File too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB)` }
  }

  return null
}

function str(val: unknown): string {
  return typeof val === 'string' ? val.trim() : ''
}

export async function POST(request: Request) {
  let body: Record<string, unknown>

  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate uploads
  const errors: ValidationError[] = []

  for (const field of ['cvUpload', 'photoUpload'] as const) {
    const err = validateUpload(body[field] as UploadPayload | null, field)
    if (err) errors.push(err)
  }

  const extraUploads = body['extraUploads']
  if (extraUploads !== undefined && extraUploads !== null) {
    if (!Array.isArray(extraUploads)) {
      errors.push({ field: 'extraUploads', reason: 'Must be an array' })
    } else {
      if (extraUploads.length > MAX_EXTRA_FILES) {
        errors.push({ field: 'extraUploads', reason: `Too many files (max ${MAX_EXTRA_FILES})` })
      }
      extraUploads.forEach((upload, i) => {
        const err = validateUpload(upload as UploadPayload, `extraUploads[${i}]`)
        if (err) errors.push(err)
      })
    }
  }

  if (errors.length > 0) {
    console.warn('[questionnaire] Upload validation failed:', errors)
    return NextResponse.json(
      { success: false, error: 'Upload validation failed', details: errors },
      { status: 422 }
    )
  }

  const orderId = str(body['orderId']) || generateOrderId()
  const date = formatDateFR()
  const lastName = str(body['lastName'])
  const firstName = str(body['firstName'])
  const warnings: string[] = []

  // Drive: create client folder + upload files
  let driveFolderName = ''
  let driveFolderUrl = ''
  let cvUrl = ''
  let photoUrl = ''
  let extraUrl = ''

  if (isDriveConfigured()) {
    const folderName = `${lastName} ${firstName} — ${orderId}`.trim()
    const folder = await createClientFolder(folderName)

    if (folder) {
      driveFolderName = folderName
      driveFolderUrl = folder.url

      const cvUpload = body['cvUpload'] as UploadPayload | null
      if (cvUpload?.name && cvUpload?.base64 && cvUpload?.mimeType) {
        const url = await uploadFileToDrive(
          folder.id,
          String(cvUpload.name),
          String(cvUpload.mimeType),
          String(cvUpload.base64)
        )
        if (url) cvUrl = url
      }

      const photoUpload = body['photoUpload'] as UploadPayload | null
      if (photoUpload?.name && photoUpload?.base64 && photoUpload?.mimeType) {
        const url = await uploadFileToDrive(
          folder.id,
          String(photoUpload.name),
          String(photoUpload.mimeType),
          String(photoUpload.base64)
        )
        if (url) photoUrl = url
      }

      if (Array.isArray(extraUploads)) {
        const extraUrls: string[] = []
        for (const upload of extraUploads as UploadPayload[]) {
          if (upload?.name && upload?.base64 && upload?.mimeType) {
            const url = await uploadFileToDrive(
              folder.id,
              String(upload.name),
              String(upload.mimeType),
              String(upload.base64)
            )
            if (url) extraUrls.push(url)
          }
        }
        extraUrl = extraUrls.join(' | ')
      }
    } else {
      warnings.push('Dossier Drive client non créé — vérifiez GOOGLE_DRIVE_CLIENTS_FOLDER_ID')
    }
  } else {
    warnings.push('Drive non configuré — fichiers non uploadés')
  }

  // Sheets: save questionnaire row
  if (!isGoogleSheetsConfigured()) {
    console.info('[questionnaire] Mock mode — Google Sheets not configured')
    return NextResponse.json({ success: true, orderId, mock: true, warnings })
  }

  const saved = await appendQuestionnaireRow({
    date,
    orderId,
    lastName,
    firstName,
    email: str(body['email']),
    password: str(body['password']),
    profession: str(body['profession']),
    seekingJob: str(body['seekingJob']),
    positionsSearched: str(body['positionsSearched']),
    motivation: str(body['motivation']),
    customRequest: str(body['customRequest']),
    clientQuestion: str(body['clientQuestion']),
    colorPalette: str(body['colorPalette']),
    siteStyle: str(body['siteStyle']),
    socialLinks: Array.isArray(body['socialLinks'])
      ? (body['socialLinks'] as { name?: string; url?: string }[])
          .map((link) => `${str(link.name)}: ${str(link.url)}`)
          .join(' | ')
      : '',
    cvLabel: str(body['cvLink']),
    photoLabel: str(body['photoLink']),
    extraLabel: str(body['extraLinks']),
    authorization: str(body['authorization']),
    driveFolderName,
    driveFolderUrl,
    cvUrl,
    photoUrl,
    extraUrl,
  })

  if (!saved) {
    console.error('[questionnaire] Failed to save to Google Sheets')
    return NextResponse.json(
      { success: false, error: "Impossible d'enregistrer le questionnaire dans Google Sheets." },
      { status: 502 }
    )
  }

  return NextResponse.json({ success: true, orderId, warnings })
}
