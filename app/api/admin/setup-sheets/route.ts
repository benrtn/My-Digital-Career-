import { NextResponse } from 'next/server'
import { applySheetFormatting, clearSheetData, isGoogleSheetsConfigured } from '@/lib/googleSheetsApi'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const authHeader = request.headers.get('x-admin-key') ?? ''
  const adminKey = process.env.ADMIN_SECRET_KEY ?? ''

  if (!adminKey || authHeader !== adminKey) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
  }

  if (!isGoogleSheetsConfigured()) {
    return NextResponse.json({ success: false, error: 'Google Sheets non configuré' }, { status: 503 })
  }

  const body = (await request.json().catch(() => ({}))) as { clearData?: boolean }
  const results: Record<string, boolean> = {}

  if (body.clearData) {
    results.clearCommandes = await clearSheetData('Suivie des commandes')
    results.clearQuestionnaire = await clearSheetData('Questionnaire')
    results.clearClients = await clearSheetData('ID client')
  }

  results.formatting = await applySheetFormatting()

  return NextResponse.json({ success: true, results })
}
