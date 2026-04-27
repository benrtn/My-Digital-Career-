import { google } from 'googleapis'

// ─── Pro Quotes Sheet ──────────────────────────────────────────────────────
// This module writes to a SEPARATE Google Sheet dedicated to Pro quote requests.
// It is completely independent from the e-CV sheets (GOOGLE_SHEETS_ID).
//
// Setup:
//   1. Create a Google Sheet named "Demandes devis - Solutions Pro" in your Drive.
//   2. Share it with your service account email.
//   3. Copy the spreadsheet ID from the URL and set it in .env.local:
//      PRO_QUOTES_SHEET_ID=your_spreadsheet_id_here
//
// Sheet tab name used: "Demandes devis"
// Expected headers (row 1):
//   Date de soumission | Nom / Prénom | Nom de l'entreprise | Email | Téléphone |
//   Type de besoin | Nombre de cartes souhaitées | Option notifications |
//   Message / Précisions | Offre estimée | Statut de la demande | Notes internes
// ────────────────────────────────────────────────────────────────────────────

const SHEET_TAB = 'Demandes devis'
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

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
    console.error('[proSheetsApi] Failed to parse service account JSON:', err)
    return null
  }
}

// Uses PRO_QUOTES_SHEET_ID — separate from GOOGLE_SHEETS_ID used for e-CV data.
// Set this variable in .env.local to enable Google Sheets integration.
function getSpreadsheetId(): string {
  return process.env.PRO_QUOTES_SHEET_ID ?? ''
}

// ─── Offer estimation logic ────────────────────────────────────────────────
function computeEstimatedOffer(needType: string, cardCount: string): string {
  if (needType === 'Carte de fidélité digitale') return '100 €'
  if (needType === 'Carte de fidélité digitale avec notifications') return '120 €'

  if (needType === 'Carte NFC commerciale' || needType === 'Plusieurs cartes NFC') {
    const count = parseInt(cardCount, 10)
    if (isNaN(count) || count <= 0) return 'Devis à préciser'
    if (count === 1) return '25 €'
    if (count === 5) return '80 €'
    if (count === 25) return '330 €'
    if (count > 25) return 'Devis manuel à réaliser'
    // Between 2-4 or 6-24: non-standard quantity
    return 'Devis à préciser'
  }

  return 'Devis à préciser'
}

// ─── Public API ────────────────────────────────────────────────────────────
export type ProQuotePayload = {
  fullName: string
  company: string
  email: string
  phone: string
  needType: string
  cardCount: string
  notificationOption: string
  message: string
}

export async function appendProQuoteToSheets(data: ProQuotePayload): Promise<void> {
  const auth = getAuth()
  const spreadsheetId = getSpreadsheetId()

  if (!auth || !spreadsheetId) {
    console.warn(
      '[proSheetsApi] Skipping Sheets write — missing GOOGLE_SERVICE_ACCOUNT_JSON or PRO_QUOTES_SHEET_ID'
    )
    return
  }

  const submittedAt = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })
  const estimatedOffer = computeEstimatedOffer(data.needType, data.cardCount)

  try {
    const sheets = google.sheets({ version: 'v4', auth })
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${SHEET_TAB}!A:L`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          submittedAt,           // A — Date de soumission
          data.fullName,         // B — Nom / Prénom
          data.company,          // C — Nom de l'entreprise
          data.email,            // D — Email
          data.phone,            // E — Téléphone
          data.needType,         // F — Type de besoin
          data.cardCount,        // G — Nombre de cartes souhaitées
          data.notificationOption, // H — Option notifications
          data.message,          // I — Message / Précisions
          estimatedOffer,        // J — Offre estimée (auto-calculated)
          'Nouveau',             // K — Statut de la demande (default)
          '',                    // L — Notes internes (empty by default)
        ]],
      },
    })
  } catch (err) {
    console.error('[proSheetsApi] appendProQuoteToSheets failed:', err)
    throw err
  }
}
