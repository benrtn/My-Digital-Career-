/**
 * Server-side helpers for the local client-downloads folder.
 *
 * Files live in uploads/client-downloads/<folder>/ (outside /public) and are
 * served through /api/client-downloads/file/[...path] with session auth.
 * On Vercel the runtime filesystem is read-only: folders only exist when they
 * were committed to the repo. Order state itself lives in Google Sheets —
 * this module is only about deliverable files (ZIP / HTML preview / image).
 */

import { readFile, readdir } from 'fs/promises'
import path from 'path'
import type { AppointmentSelection } from '@/types'

export const CLIENT_DOWNLOADS_DIR = path.join(process.cwd(), 'uploads', 'client-downloads')

export interface ClientFolderMetadata {
  firstName?: string
  lastName?: string
  email?: string
  passwordHash?: string
  orderId?: string
  createdAt?: string
  unlockAt?: string
  folderName?: string
  appointment?: AppointmentSelection | null
}

export interface ClientFolderStatus {
  folderName: string
  createdAt: string | null
  unlockAt: string | null
  remainingMs: number
  zipUrl: string | null
  previewUrl: string | null
  previewImageUrl: string | null
  hasZip: boolean
  hasPreview: boolean
  readyAt: boolean
  orderId: string | null
  appointment: AppointmentSelection | null
}

export async function readFolderMetadata(folderName: string): Promise<ClientFolderMetadata | null> {
  try {
    const raw = await readFile(path.join(CLIENT_DOWNLOADS_DIR, folderName, 'metadata.json'), 'utf8')
    return JSON.parse(raw) as ClientFolderMetadata
  } catch {
    return null
  }
}

export async function findClientFolder({
  email,
  folder,
}: {
  email?: string
  folder?: string
}): Promise<ClientFolderStatus | null> {
  let entries
  try {
    entries = await readdir(CLIENT_DOWNLOADS_DIR, { withFileTypes: true })
  } catch {
    // Directory doesn't exist (e.g. fresh Vercel deployment)
    return null
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    if (folder && entry.name !== folder) continue

    const metadata = await readFolderMetadata(entry.name)

    if (email && metadata?.email?.trim().toLowerCase() !== email.trim().toLowerCase()) {
      continue
    }

    const folderPath = path.join(CLIENT_DOWNLOADS_DIR, entry.name)
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
