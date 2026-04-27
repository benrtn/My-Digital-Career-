import { NextRequest, NextResponse } from 'next/server'
import { appendProQuoteToSheets } from '@/lib/proSheetsApi'

// POST /api/pro-quotes
// Receives a pro quote request form submission and appends it to the
// "Demandes devis - Solutions Pro" Google Sheet (PRO_QUOTES_SHEET_ID).
// Completely separate from the e-CV questionnaire and orders sheets.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      fullName,
      company,
      email,
      phone,
      needType,
      cardCount,
      notificationOption,
      message,
    } = body

    // Required field validation
    if (!fullName?.trim()) {
      return NextResponse.json({ error: 'Le nom / prénom est obligatoire.' }, { status: 400 })
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "L'adresse email est obligatoire." }, { status: 400 })
    }
    if (!needType?.trim()) {
      return NextResponse.json({ error: 'Le type de besoin est obligatoire.' }, { status: 400 })
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(String(email))) {
      return NextResponse.json({ error: 'Adresse email invalide.' }, { status: 400 })
    }

    // Sanitise and cap field lengths before writing to Sheets
    await appendProQuoteToSheets({
      fullName: String(fullName).trim().slice(0, 200),
      company: String(company ?? '').trim().slice(0, 200),
      email: String(email).toLowerCase().trim().slice(0, 200),
      phone: String(phone ?? '').trim().slice(0, 50),
      needType: String(needType).trim().slice(0, 200),
      cardCount: String(cardCount ?? '').trim().slice(0, 20),
      notificationOption: String(notificationOption ?? '').trim().slice(0, 100),
      message: String(message ?? '').trim().slice(0, 2000),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/pro-quotes] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Une erreur est survenue. Veuillez réessayer ou nous contacter directement.' },
      { status: 500 }
    )
  }
}
