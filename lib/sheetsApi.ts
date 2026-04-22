import { google } from 'googleapis'

const SHEET_APPOINTMENTS = 'Rendez-vous'
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

export type SheetAppointmentRecord = {
  id: string
  email: string
  firstName: string
  lastName: string
  startAt: string
  endAt: string
  durationMinutes: number
  mode: 'google_meet'
  meetLink?: string
  eventId?: string
  createdAt: string
}

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return null
  try {
    const credentials = JSON.parse(raw)
    return new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: SCOPES,
    })
  } catch (err) {
    console.error('[sheetsApi] Failed to parse service account JSON:', err)
    return null
  }
}

function getSpreadsheetId(): string {
  return process.env.GOOGLE_SHEETS_ID || '1dxEE12fXMzXi2NPzviiy9jm1uiFDo0hRApCkiQFipw0'
}

export async function readAppointmentsFromSheets(): Promise<SheetAppointmentRecord[]> {
  const auth = getAuth()
  if (!auth) return []

  try {
    const sheets = google.sheets({ version: 'v4', auth })
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `${SHEET_APPOINTMENTS}!A2:L`,
    })

    const rows = res.data.values ?? []
    return rows
      .filter((row) => row[0])
      .map((row) => ({
        id: String(row[0] ?? ''),
        createdAt: String(row[1] ?? ''),
        email: String(row[2] ?? '').toLowerCase(),
        lastName: String(row[3] ?? ''),
        firstName: String(row[4] ?? ''),
        startAt: String(row[5] ?? ''),
        endAt: String(row[6] ?? ''),
        durationMinutes: Number(row[7] ?? 60),
        mode: 'google_meet' as const,
        meetLink: String(row[9] ?? '') || undefined,
        eventId: String(row[10] ?? '') || undefined,
      }))
  } catch (err) {
    console.error('[sheetsApi] readAppointmentsFromSheets failed:', err)
    return []
  }
}

export async function appendAppointmentToSheets(
  record: SheetAppointmentRecord & { orderId?: string }
): Promise<void> {
  const auth = getAuth()
  if (!auth) {
    console.warn('[sheetsApi] No service account configured — skipping Sheets write')
    return
  }

  try {
    const sheets = google.sheets({ version: 'v4', auth })
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
      range: `${SHEET_APPOINTMENTS}!A:L`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          record.id,
          record.createdAt,
          record.email,
          record.lastName,
          record.firstName,
          record.startAt,
          record.endAt,
          record.durationMinutes,
          record.mode,
          record.meetLink ?? '',
          record.eventId ?? '',
          record.orderId ?? '',
        ]],
      },
    })
  } catch (err) {
    console.error('[sheetsApi] appendAppointmentToSheets failed:', err)
    throw err
  }
}
