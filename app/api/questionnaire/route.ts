import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

// ---------------------------------------------------------------------------
// Upload validation constants
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
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

  if (!name) {
    return { field: fieldName, reason: 'Missing filename' }
  }

  if (!SAFE_FILENAME_RE.test(name)) {
    return { field: fieldName, reason: `Unsafe filename: ${name}` }
  }

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { field: fieldName, reason: `Unsupported file type: ${mimeType}` }
  }

  if (!BASE64_RE.test(base64)) {
    return { field: fieldName, reason: 'Invalid base64 data' }
  }

  // Approximate decoded size: base64 length * 3/4
  const approxBytes = Math.floor((base64.length * 3) / 4)
  if (approxBytes > MAX_FILE_SIZE_BYTES) {
    return { field: fieldName, reason: `File too large (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB)` }
  }

  return null
}

// ---------------------------------------------------------------------------
// Route handler — validates uploads then proxies to Apps Script
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  let body: Record<string, unknown>

  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const errors: ValidationError[] = []

  // Validate single uploads
  for (const field of ['cvUpload', 'photoUpload'] as const) {
    const err = validateUpload(body[field] as UploadPayload | null, field)
    if (err) errors.push(err)
  }

  // Validate extra uploads array
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

  // Forward to Apps Script
  const endpoint = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL

  if (!endpoint) {
    // Mock mode
    console.info('[questionnaire] Mock mode — Apps Script URL not configured')
    return NextResponse.json({ success: true, ok: true, mock: true })
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ action: 'submitQuestionnaire', ...body }),
    })

    if (!res.ok) {
      const text = await res.text()
      console.error('[questionnaire] Apps Script error:', res.status, text)
      return NextResponse.json(
        { success: false, error: 'Upstream error' },
        { status: 502 }
      )
    }

    const json = await res.json()
    return NextResponse.json({ success: true, ...json })
  } catch (err) {
    console.error('[questionnaire] Proxy failed:', err)
    return NextResponse.json(
      { success: false, error: 'Questionnaire submission failed' },
      { status: 500 }
    )
  }
}
