import { NextResponse } from 'next/server'
import { applySheetFormatting, clearSheetData, isGoogleSheetsConfigured } from '@/lib/googleSheetsApi'
import { verifyAdminToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('mdc-admin-session')?.value
  if (!token) {
    return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
  }

  const admin = await verifyAdminToken(token)
  if (!admin) {
    return NextResponse.json({ success: false, error: 'Session invalide' }, { status: 401 })
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
