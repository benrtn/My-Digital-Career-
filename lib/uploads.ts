import type { QuestionnaireUpload } from '@/types'

export const MAX_CHAT_ATTACHMENTS = 5
export const MAX_CHAT_ATTACHMENT_SIZE_MB = 5

export function isUploadSizeAllowed(file: File, maxMb: number): boolean {
  return file.size <= maxMb * 1024 * 1024
}

export function toUploadPayload(file: File): Promise<QuestionnaireUpload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new globalThis.Error('Invalid file reader result'))
        return
      }

      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64,
      })
    }

    reader.onerror = () => reject(reader.error || new globalThis.Error('File read failed'))
    reader.readAsDataURL(file)
  })
}
