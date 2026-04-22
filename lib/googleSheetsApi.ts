/**
 * Google Sheets API — direct server-side integration.
 *
 * This module mirrors the legacy Apps Script spreadsheet structure so the
 * existing Google Sheets tabs keep working without breaking the admin data flow.
 */

import { google, sheets_v4 } from 'googleapis'

const SHEET_COMMANDES = 'Suivie des commandes'
const SHEET_QUESTIONNAIRE = 'Questionnaire'
const SHEET_ID_CLIENT = 'ID client'
const SHEET_COOKIES = 'Cookies'
const SHEET_APPOINTMENTS = 'Rendez-vous'

const ORDER_HEADERS = [
  'N° Commande',
  'Date',
  'Nom',
  'Prénom',
  'Email',
  'Statut',
  'Montant',
  'Devise',
  'Profession',
  'Poste(s) recherché(s)',
  'Palette',
  'Style',
  'Chat Activé',
  'Première Version Envoyée',
  'URL Site',
  'Payé',
  'Date du rendez-vous',
  'Heure du Google Meet',
  'Lien du google meet',
  'Event ID',
] as const

const QUESTIONNAIRE_HEADERS = [
  'Dates',
  'N° Commande',
  'Nom',
  'Prénom',
  'Adresse mail',
  'Mot de passe',
  'Profession / milieu',
  'Recherche d’emploi',
  'Poste(s) recherché(s)',
  'Objectif du E-CV',
  'Requête particulière',
  'Palette de couleurs',
  'Style du site',
  'Réseaux sociaux',
  'CV',
  'Photo',
  'Éléments supplémentaires',
  'Autorisation',
  'Dossier client',
  'URL Dossier client',
  'URL CV',
  'URL Photo',
  'URL Extra',
] as const

const CLIENT_ID_HEADERS = [
  'Numéro de commande',
  'Dates',
  'Nom',
  'Prénom',
  'Adresse mail',
  'Mot de passe',
  'Autorisation',
  'Cookies acceptés',
] as const

const COOKIE_HEADERS = [
  'Numéro de commande',
  'Dates',
  'Email',
  'Nom',
  'Prénom',
  'Essentiels',
  'Audience (Analytics)',
  'Paiement (Stripe/PayPal)',
  'Choix global',
] as const

const APPOINTMENT_HEADERS = [
  'ID',
  'Date création',
  'Email',
  'Nom',
  'Prénom',
  'Début (UTC)',
  'Fin (UTC)',
  'Durée (min)',
  'Mode',
  'Lien Meet',
  'Event ID',
  'N° Commande',
] as const

type HeaderList = readonly string[]

function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function toColumnLetter(index: number): string {
  let current = index
  let output = ''

  while (current > 0) {
    const remainder = (current - 1) % 26
    output = String.fromCharCode(65 + remainder) + output
    current = Math.floor((current - 1) / 26)
  }

  return output
}

export function isGoogleSheetsConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() &&
    process.env.GOOGLE_SPREADSHEET_ID?.trim()
  )
}

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) {
    console.error('[GoogleSheets] GOOGLE_SERVICE_ACCOUNT_JSON not set')
    return null
  }

  try {
    const credentials = JSON.parse(raw)
    return new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
  } catch (error) {
    console.error('[GoogleSheets] Failed to parse service account JSON:', error)
    return null
  }
}

function getSpreadsheetId(): string {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID?.trim()
  if (!spreadsheetId) {
    throw new Error('[GoogleSheets] GOOGLE_SPREADSHEET_ID not set')
  }
  return spreadsheetId
}

function getSheetsClient(): sheets_v4.Sheets | null {
  const auth = getAuth()
  if (!auth) return null
  return google.sheets({ version: 'v4', auth })
}

async function readHeaderRow(sheetName: string): Promise<string[]> {
  const sheets = getSheetsClient()
  if (!sheets) return []

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!1:1`,
    })

    return (response.data.values?.[0] as string[] | undefined) ?? []
  } catch (error) {
    console.error(`[GoogleSheets] Failed to read header row for "${sheetName}":`, error)
    return []
  }
}

async function writeHeaderRow(sheetName: string, headers: string[]): Promise<boolean> {
  const sheets = getSheetsClient()
  if (!sheets) return false

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!A1:${toColumnLetter(headers.length)}1`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [headers],
      },
    })

    return true
  } catch (error) {
    console.error(`[GoogleSheets] Failed to write header row for "${sheetName}":`, error)
    return false
  }
}

async function ensureSheetExists(sheetName: string): Promise<boolean> {
  const sheets = getSheetsClient()
  if (!sheets) return false

  try {
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: getSpreadsheetId(),
      fields: 'sheets.properties.title',
    })

    const exists = metadata.data.sheets?.some(
      (sheet) => sheet.properties?.title === sheetName
    )

    if (exists) {
      return true
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: getSpreadsheetId(),
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: sheetName,
              },
            },
          },
        ],
      },
    })

    console.info(`[GoogleSheets] Created missing sheet "${sheetName}"`)
    return true
  } catch (error) {
    console.error(`[GoogleSheets] Failed to ensure sheet "${sheetName}":`, error)
    return false
  }
}

async function ensureHeaders(sheetName: string, requiredHeaders: HeaderList): Promise<string[] | null> {
  const sheetReady = await ensureSheetExists(sheetName)
  if (!sheetReady) return null

  const currentHeaders = await readHeaderRow(sheetName)

  if (currentHeaders.length === 0) {
    const created = await writeHeaderRow(sheetName, [...requiredHeaders])
    return created ? [...requiredHeaders] : null
  }

  const nextHeaders = [...currentHeaders]
  let changed = false

  for (const header of requiredHeaders) {
    const alreadyPresent = nextHeaders.some(
      (current) => normalizeHeader(current) === normalizeHeader(header)
    )

    if (!alreadyPresent) {
      nextHeaders.push(header)
      changed = true
    }
  }

  if (!changed) {
    return nextHeaders
  }

  const updated = await writeHeaderRow(sheetName, nextHeaders)
  return updated ? nextHeaders : null
}

function getHeaderIndex(headers: string[], headerName: string): number {
  const target = normalizeHeader(headerName)
  return headers.findIndex((header) => normalizeHeader(header) === target)
}

function buildRow(headers: string[], values: Record<string, string>): string[] {
  const row = Array.from({ length: headers.length }, () => '')

  for (const [headerName, value] of Object.entries(values)) {
    const index = getHeaderIndex(headers, headerName)
    if (index >= 0) {
      row[index] = value
    }
  }

  return row
}

async function appendRowToSheet(sheetName: string, values: string[]): Promise<boolean> {
  const sheets = getSheetsClient()
  if (!sheets) return false

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!A:A`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [values],
      },
    })

    console.info(`[GoogleSheets] Appended row to "${sheetName}"`)
    return true
  } catch (error) {
    console.error(`[GoogleSheets] Failed to append row to "${sheetName}":`, error)
    return false
  }
}

async function appendMappedRow(
  sheetName: string,
  requiredHeaders: HeaderList,
  values: Record<string, string>
): Promise<boolean> {
  const headers = await ensureHeaders(sheetName, requiredHeaders)
  if (!headers) return false

  return appendRowToSheet(sheetName, buildRow(headers, values))
}

async function readSheet(sheetName: string): Promise<string[][]> {
  const sheets = getSheetsClient()
  if (!sheets) return []

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: getSpreadsheetId(),
      range: sheetName,
    })

    return (response.data.values as string[][]) ?? []
  } catch (error) {
    console.error(`[GoogleSheets] Failed to read "${sheetName}":`, error)
    return []
  }
}

async function updateCell(sheetName: string, range: string, value: string): Promise<boolean> {
  const sheets = getSheetsClient()
  if (!sheets) return false

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!${range}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[value]],
      },
    })

    return true
  } catch (error) {
    console.error(`[GoogleSheets] Failed to update "${sheetName}!${range}":`, error)
    return false
  }
}

async function findRowByHeaderValue(
  sheetName: string,
  requiredHeaders: HeaderList,
  headerName: string,
  searchValue: string
): Promise<{ headers: string[]; rowIndex: number; row: string[] } | null> {
  const headers = await ensureHeaders(sheetName, requiredHeaders)
  if (!headers) return null

  const columnIndex = getHeaderIndex(headers, headerName)
  if (columnIndex < 0) {
    console.warn(`[GoogleSheets] Header "${headerName}" missing from "${sheetName}"`)
    return null
  }

  const rows = await readSheet(sheetName)
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const value = rows[rowIndex]?.[columnIndex] ?? ''
    if (value.trim().toLowerCase() === searchValue.trim().toLowerCase()) {
      return {
        headers,
        rowIndex: rowIndex + 1,
        row: rows[rowIndex] ?? [],
      }
    }
  }

  return null
}

function getRowValue(row: string[], headers: string[], headerName: string): string {
  const index = getHeaderIndex(headers, headerName)
  return index >= 0 ? row[index] ?? '' : ''
}

async function updateRowByHeaderValue(
  sheetName: string,
  requiredHeaders: HeaderList,
  searchHeader: string,
  searchValue: string,
  updates: Record<string, string>
): Promise<boolean> {
  const match = await findRowByHeaderValue(sheetName, requiredHeaders, searchHeader, searchValue)
  if (!match) {
    console.warn(`[GoogleSheets] Row not found in "${sheetName}" for ${searchHeader}="${searchValue}"`)
    return false
  }

  const nextRow = Array.from({ length: match.headers.length }, (_, index) => match.row[index] ?? '')

  for (const [headerName, value] of Object.entries(updates)) {
    const index = getHeaderIndex(match.headers, headerName)
    if (index >= 0) {
      nextRow[index] = value
    }
  }

  const sheets = getSheetsClient()
  if (!sheets) return false

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: getSpreadsheetId(),
      range: `${sheetName}!A${match.rowIndex}:${toColumnLetter(match.headers.length)}${match.rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [nextRow],
      },
    })

    console.info(`[GoogleSheets] Updated row ${match.rowIndex} in "${sheetName}"`)
    return true
  } catch (error) {
    console.error(`[GoogleSheets] Failed to update row ${match.rowIndex} in "${sheetName}":`, error)
    return false
  }
}

export interface OrderRow {
  orderId: string
  date: string
  lastName: string
  firstName: string
  email: string
  status: string
  amount: string
  currency: string
  profession: string
  positionsSearched: string
  colorPalette: string
  siteStyle: string
  chatEnabled?: string
  firstVersionSent?: string
  siteUrl?: string
  paid?: string
  appointmentDate?: string
  meetTime?: string
  meetLink?: string
  eventId?: string
}

export async function appendOrderRow(data: OrderRow): Promise<boolean> {
  return appendMappedRow(SHEET_COMMANDES, ORDER_HEADERS, {
    'N° Commande': data.orderId,
    Date: data.date,
    Nom: data.lastName,
    'Prénom': data.firstName,
    Email: data.email,
    Statut: data.status,
    Montant: data.amount,
    Devise: data.currency,
    Profession: data.profession,
    'Poste(s) recherché(s)': data.positionsSearched,
    Palette: data.colorPalette,
    Style: data.siteStyle,
    'Chat Activé': data.chatEnabled ?? 'Non',
    'Première Version Envoyée': data.firstVersionSent ?? 'Non',
    'URL Site': data.siteUrl ?? '',
    'Payé': data.paid ?? 'Non',
    'Date du rendez-vous': data.appointmentDate ?? '',
    'Heure du Google Meet': data.meetTime ?? '',
    'Lien du google meet': data.meetLink ?? '',
    'Event ID': data.eventId ?? '',
  })
}

export async function updateOrderInSheets(
  orderId: string,
  updates: Partial<OrderRow>
): Promise<boolean> {
  return updateRowByHeaderValue(SHEET_COMMANDES, ORDER_HEADERS, 'N° Commande', orderId, {
    ...(updates.date !== undefined ? { Date: updates.date } : {}),
    ...(updates.lastName !== undefined ? { Nom: updates.lastName } : {}),
    ...(updates.firstName !== undefined ? { 'Prénom': updates.firstName } : {}),
    ...(updates.email !== undefined ? { Email: updates.email } : {}),
    ...(updates.status !== undefined ? { Statut: updates.status } : {}),
    ...(updates.amount !== undefined ? { Montant: updates.amount } : {}),
    ...(updates.currency !== undefined ? { Devise: updates.currency } : {}),
    ...(updates.profession !== undefined ? { Profession: updates.profession } : {}),
    ...(updates.positionsSearched !== undefined ? { 'Poste(s) recherché(s)': updates.positionsSearched } : {}),
    ...(updates.colorPalette !== undefined ? { Palette: updates.colorPalette } : {}),
    ...(updates.siteStyle !== undefined ? { Style: updates.siteStyle } : {}),
    ...(updates.chatEnabled !== undefined ? { 'Chat Activé': updates.chatEnabled } : {}),
    ...(updates.firstVersionSent !== undefined ? { 'Première Version Envoyée': updates.firstVersionSent } : {}),
    ...(updates.siteUrl !== undefined ? { 'URL Site': updates.siteUrl } : {}),
    ...(updates.paid !== undefined ? { 'Payé': updates.paid } : {}),
    ...(updates.appointmentDate !== undefined ? { 'Date du rendez-vous': updates.appointmentDate } : {}),
    ...(updates.meetTime !== undefined ? { 'Heure du Google Meet': updates.meetTime } : {}),
    ...(updates.meetLink !== undefined ? { 'Lien du google meet': updates.meetLink } : {}),
    ...(updates.eventId !== undefined ? { 'Event ID': updates.eventId } : {}),
  })
}

export interface QuestionnaireRow {
  date: string
  orderId: string
  lastName: string
  firstName: string
  email: string
  password?: string
  profession: string
  seekingJob: string
  positionsSearched: string
  motivation: string
  customRequest: string
  colorPalette: string
  siteStyle: string
  socialLinks: string
  cvLabel: string
  photoLabel: string
  extraLabel: string
  authorization: string
  driveFolderName?: string
  driveFolderUrl?: string
  cvUrl?: string
  photoUrl?: string
  extraUrl?: string
}

export async function appendQuestionnaireRow(data: QuestionnaireRow): Promise<boolean> {
  return appendMappedRow(SHEET_QUESTIONNAIRE, QUESTIONNAIRE_HEADERS, {
    Dates: data.date,
    'N° Commande': data.orderId,
    Nom: data.lastName,
    'Prénom': data.firstName,
    'Adresse mail': data.email,
    'Mot de passe': data.password ?? '',
    'Profession / milieu': data.profession,
    'Recherche d’emploi': data.seekingJob,
    'Poste(s) recherché(s)': data.positionsSearched,
    'Objectif du E-CV': data.motivation,
    'Requête particulière': data.customRequest,
    'Palette de couleurs': data.colorPalette,
    'Style du site': data.siteStyle,
    'Réseaux sociaux': data.socialLinks,
    CV: data.cvLabel,
    Photo: data.photoLabel,
    'Éléments supplémentaires': data.extraLabel,
    Autorisation: data.authorization,
    'Dossier client': data.driveFolderName ?? '',
    'URL Dossier client': data.driveFolderUrl ?? '',
    'URL CV': data.cvUrl ?? '',
    'URL Photo': data.photoUrl ?? '',
    'URL Extra': data.extraUrl ?? '',
  })
}

export interface ClientIdRow {
  orderId: string
  date: string
  lastName: string
  firstName: string
  email: string
  passwordHash: string
  authorization?: string
  cookiesAccepted?: string
}

export async function appendClientIdRow(data: ClientIdRow): Promise<boolean> {
  return appendMappedRow(SHEET_ID_CLIENT, CLIENT_ID_HEADERS, {
    'Numéro de commande': data.orderId,
    Dates: data.date,
    Nom: data.lastName,
    'Prénom': data.firstName,
    'Adresse mail': data.email,
    'Mot de passe': data.passwordHash,
    Autorisation: data.authorization ?? '',
    'Cookies acceptés': data.cookiesAccepted ?? '',
  })
}

export async function updateClientIdConsent(
  email: string,
  updates: { authorization?: string; cookiesAccepted?: string }
): Promise<boolean> {
  return updateRowByHeaderValue(SHEET_ID_CLIENT, CLIENT_ID_HEADERS, 'Adresse mail', email, {
    ...(updates.authorization !== undefined ? { Autorisation: updates.authorization } : {}),
    ...(updates.cookiesAccepted !== undefined ? { 'Cookies acceptés': updates.cookiesAccepted } : {}),
  })
}

export async function findClientByEmail(email: string): Promise<{
  rowIndex: number
  orderId: string
  lastName: string
  firstName: string
  email: string
  passwordHash: string
} | null> {
  const match = await findRowByHeaderValue(SHEET_ID_CLIENT, CLIENT_ID_HEADERS, 'Adresse mail', email)
  if (!match) return null

  return {
    rowIndex: match.rowIndex,
    orderId: getRowValue(match.row, match.headers, 'Numéro de commande'),
    lastName: getRowValue(match.row, match.headers, 'Nom'),
    firstName: getRowValue(match.row, match.headers, 'Prénom'),
    email: getRowValue(match.row, match.headers, 'Adresse mail'),
    passwordHash: getRowValue(match.row, match.headers, 'Mot de passe'),
  }
}

export interface CookieConsentRow {
  orderId?: string
  date: string
  email: string
  lastName?: string
  firstName?: string
  essentials: boolean
  analytics: boolean
  payments: boolean
}

export async function appendCookieRow(data: CookieConsentRow): Promise<boolean> {
  const globalChoice = data.analytics && data.payments
    ? 'Tout accepté'
    : !data.analytics && !data.payments
      ? 'Refusé (essentiels uniquement)'
      : 'Personnalisé'

  return appendMappedRow(SHEET_COOKIES, COOKIE_HEADERS, {
    'Numéro de commande': data.orderId ?? '',
    Dates: data.date,
    Email: data.email,
    Nom: data.lastName ?? '',
    'Prénom': data.firstName ?? '',
    Essentiels: data.essentials ? 'Oui' : 'Non',
    'Audience (Analytics)': data.analytics ? 'Oui' : 'Non',
    'Paiement (Stripe/PayPal)': data.payments ? 'Oui' : 'Non',
    'Choix global': globalChoice,
  })
}

export interface AppointmentSheetRow {
  id: string
  createdAt: string
  email: string
  lastName: string
  firstName: string
  startAt: string
  endAt: string
  durationMinutes: number
  mode: string
  meetLink?: string
  eventId?: string
  orderId?: string
}

export async function appendAppointmentRow(data: AppointmentSheetRow): Promise<boolean> {
  return appendMappedRow(SHEET_APPOINTMENTS, APPOINTMENT_HEADERS, {
    ID: data.id,
    'Date création': data.createdAt,
    Email: data.email,
    Nom: data.lastName,
    'Prénom': data.firstName,
    'Début (UTC)': data.startAt,
    'Fin (UTC)': data.endAt,
    'Durée (min)': String(data.durationMinutes),
    Mode: data.mode,
    'Lien Meet': data.meetLink ?? '',
    'Event ID': data.eventId ?? '',
    'N° Commande': data.orderId ?? '',
  })
}

export async function updateOrderAppointment(
  orderId: string,
  appointmentDate: string,
  meetTime: string,
  meetLink: string,
  eventId = ''
): Promise<boolean> {
  return updateOrderInSheets(orderId, {
    appointmentDate,
    meetTime,
    meetLink,
    eventId,
  })
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paid: string,
  status: string
): Promise<boolean> {
  return updateOrderInSheets(orderId, { paid, status })
}

export async function getOrderByOrderId(orderId: string): Promise<OrderRow | null> {
  const match = await findRowByHeaderValue(SHEET_COMMANDES, ORDER_HEADERS, 'N° Commande', orderId)
  if (!match) return null

  return {
    orderId: getRowValue(match.row, match.headers, 'N° Commande'),
    date: getRowValue(match.row, match.headers, 'Date'),
    lastName: getRowValue(match.row, match.headers, 'Nom'),
    firstName: getRowValue(match.row, match.headers, 'Prénom'),
    email: getRowValue(match.row, match.headers, 'Email'),
    status: getRowValue(match.row, match.headers, 'Statut'),
    amount: getRowValue(match.row, match.headers, 'Montant'),
    currency: getRowValue(match.row, match.headers, 'Devise'),
    profession: getRowValue(match.row, match.headers, 'Profession'),
    positionsSearched: getRowValue(match.row, match.headers, 'Poste(s) recherché(s)'),
    colorPalette: getRowValue(match.row, match.headers, 'Palette'),
    siteStyle: getRowValue(match.row, match.headers, 'Style'),
    chatEnabled: getRowValue(match.row, match.headers, 'Chat Activé'),
    firstVersionSent: getRowValue(match.row, match.headers, 'Première Version Envoyée'),
    siteUrl: getRowValue(match.row, match.headers, 'URL Site'),
    paid: getRowValue(match.row, match.headers, 'Payé'),
    appointmentDate: getRowValue(match.row, match.headers, 'Date du rendez-vous'),
    meetTime: getRowValue(match.row, match.headers, 'Heure du Google Meet'),
    meetLink: getRowValue(match.row, match.headers, 'Lien du google meet'),
    eventId: getRowValue(match.row, match.headers, 'Event ID'),
  }
}

export { readSheet, updateCell }

// ─────────────────────────────────────────────────
// Admin helpers — read full sheets as rich objects
// ─────────────────────────────────────────────────

function rowsToObjects(rows: string[][]): Record<string, string>[] {
  if (rows.length < 2) return []
  const headers = rows[0] ?? []
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((header, index) => {
      obj[header] = row[index] ?? ''
    })
    return obj
  })
}

export async function readOrders(): Promise<Record<string, string>[]> {
  return rowsToObjects(await readSheet(SHEET_COMMANDES))
}

export async function readQuestionnaires(): Promise<Record<string, string>[]> {
  return rowsToObjects(await readSheet(SHEET_QUESTIONNAIRE))
}

export async function readClients(): Promise<Record<string, string>[]> {
  return rowsToObjects(await readSheet(SHEET_ID_CLIENT))
}

export async function readAppointments(): Promise<Record<string, string>[]> {
  return rowsToObjects(await readSheet(SHEET_APPOINTMENTS))
}

export async function readCookieConsents(): Promise<Record<string, string>[]> {
  return rowsToObjects(await readSheet(SHEET_COOKIES))
}
