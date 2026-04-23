/**
 * Order utility functions
 *
 * Generates unique order IDs with format: MDC-YYMMDD-XXXX
 * where XXXX is a random 4-character alphanumeric suffix.
 */

export function generateOrderId(): string {
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const suffix = randomAlphanumeric(4)
  return `MDC-${yy}${mm}${dd}-${suffix}`
}

function randomAlphanumeric(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1 to avoid confusion
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

export function formatDateFR(date: Date = new Date()): string {
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    timeZone: 'Europe/Paris',
  })
}
