/**
 * GET /api/admin/dashboard
 *
 * Reads directly from Google Sheets (source of truth) and maps the raw
 * French-header rows to the shapes the admin UI consumes.
 * Conversations still come from Apps Script (chat lives there).
 * Auth: HttpOnly admin session cookie.
 */

import { NextResponse } from 'next/server'
import {
  isGoogleSheetsConfigured,
  readAppointments,
  readClients,
  readOrders,
  readQuestionnaires,
} from '@/lib/googleSheetsApi'
import { getAdminConversations } from '@/lib/googleSheets'
import { getAdminSessionFromRequest, getRequiredAdminKey } from '@/lib/session.server'

export const runtime = 'nodejs'

type Row = Record<string, string>

function v(row: Row, ...keys: string[]): string {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim()
    }
  }
  return ''
}

function isYes(value: string): boolean {
  const lower = value.trim().toLowerCase()
  return lower === 'oui' || lower === 'yes' || lower === 'true'
}

/** Parses "11/06/2026 14:30" (fr-FR) or ISO strings. */
function parseDate(value: string): Date | null {
  if (!value) return null
  const frMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ ,]+(\d{2}):(\d{2}))?/)
  if (frMatch) {
    const [, dd, mm, yyyy, hh = '0', min = '0'] = frMatch
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min))
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseAmount(value: string): number {
  const match = value.replace(',', '.').match(/[\d.]+/)
  return match ? parseFloat(match[0]) || 0 : 0
}

function mapOrder(row: Row) {
  const firstName = v(row, 'Prénom')
  const lastName = v(row, 'Nom')
  return {
    orderId: v(row, 'N° Commande', 'Numéro de commande'),
    date: v(row, 'Dates', 'Date'),
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email: v(row, 'Adresse mail', 'Email').toLowerCase(),
    status: v(row, 'Statut') || 'En attente',
    paid: isYes(v(row, 'Payé ?', 'Payé')),
    hosting: isYes(v(row, 'Option hébergement')),
    amount: v(row, 'Montant'),
    meetTime: v(row, 'Heure du meet'),
    meetLink: v(row, 'Lien du google meet'),
    siteUrl: v(row, 'URL Site'),
    firstVersionSent: isYes(v(row, 'Première version envoyée')),
  }
}

function mapClient(row: Row) {
  const firstName = v(row, 'Prénom')
  const lastName = v(row, 'Nom')
  return {
    orderId: v(row, 'N° Commande', 'Numéro de commande'),
    date: v(row, 'Dates', 'Date'),
    name: `${firstName} ${lastName}`.trim(),
    email: v(row, 'Adresse mail', 'Email').toLowerCase(),
    authorization: v(row, 'Veux apparaître sur le site ?'),
    cookies: v(row, 'Cookies'),
  }
}

function mapQuestionnaire(row: Row) {
  return {
    orderId: v(row, 'N° Commande'),
    date: v(row, 'Dates', 'Date'),
    lastName: v(row, 'Nom'),
    firstName: v(row, 'Prénom'),
    email: v(row, 'Adresse mail').toLowerCase(),
    profession: v(row, 'Profession', 'Profession / milieu'),
    seekingJob: v(row, "Recherche d'emploi ?", 'Recherche d’emploi'),
    positionsSearched: v(row, 'Postes recherchés', 'Poste(s) recherché(s)'),
    motivations: v(row, 'Pourquoi un E-CV ?', 'Objectif du E-CV'),
    customRequest: v(row, 'Requête', 'Requête particulière'),
    clientQuestion: v(row, 'Question client'),
    colorPalette: v(row, 'Palette', 'Palette de couleurs'),
    siteStyle: v(row, 'Style du site'),
    socialLinks: v(row, 'Liens', 'Réseaux sociaux'),
    cvUrl: v(row, 'PJ 1', 'URL CV', 'CV'),
    photoUrl: v(row, 'PJ 2', 'URL Photo', 'Photo'),
    extraUrl: v(row, 'PJ 3', 'URL Extra', 'Éléments supplémentaires'),
    authorization: v(row, 'Veux apparaître sur le site ?', 'Autorisation'),
  }
}

function mapAppointment(row: Row) {
  return {
    id: v(row, 'ID'),
    createdAt: v(row, 'Date création'),
    email: v(row, 'Email').toLowerCase(),
    lastName: v(row, 'Nom'),
    firstName: v(row, 'Prénom'),
    startAt: v(row, 'Début (UTC)'),
    endAt: v(row, 'Fin (UTC)'),
    durationMinutes: Number(v(row, 'Durée (min)')) || 30,
    mode: v(row, 'Mode') || 'google_meet',
    meetLink: v(row, 'Lien Meet') || undefined,
    eventId: v(row, 'Event ID') || undefined,
    orderId: v(row, 'N° Commande') || undefined,
  }
}

export async function GET(request: Request) {
  const session = await getAdminSessionFromRequest(request)
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const warnings: string[] = []

  try {
    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Google Sheets non configuré (GOOGLE_SERVICE_ACCOUNT_JSON / GOOGLE_SPREADSHEET_ID)' },
        { status: 503 }
      )
    }

    const [orderRows, questionnaireRows, clientRows, appointmentRows] = await Promise.all([
      readOrders().catch((e) => {
        warnings.push('Commandes indisponibles')
        console.error('[admin/dashboard] orders failed:', e)
        return [] as Row[]
      }),
      readQuestionnaires().catch((e) => {
        warnings.push('Questionnaires indisponibles')
        console.error('[admin/dashboard] questionnaires failed:', e)
        return [] as Row[]
      }),
      readClients().catch((e) => {
        warnings.push('Clients indisponibles')
        console.error('[admin/dashboard] clients failed:', e)
        return [] as Row[]
      }),
      readAppointments().catch((e) => {
        warnings.push('Rendez-vous indisponibles')
        console.error('[admin/dashboard] appointments failed:', e)
        return [] as Row[]
      }),
    ])

    // Conversations come from Apps Script (chat isn't in the direct Sheets schema)
    let conversations: unknown[] = []
    try {
      const adminKey = getRequiredAdminKey()
      const convResult = await getAdminConversations(adminKey)
      conversations = (convResult.data?.conversations as unknown[]) ?? []
    } catch {
      warnings.push('Conversations indisponibles')
    }

    const orders = orderRows.map(mapOrder).filter((o) => o.orderId || o.email)
    const questionnaires = questionnaireRows.map(mapQuestionnaire).filter((q) => q.orderId || q.email)
    const clients = clientRows.map(mapClient).filter((c) => c.email)
    const appointments = appointmentRows.map(mapAppointment).filter((a) => a.id)

    // ── KPIs ──
    const active = orders.filter((o) => o.status.toLowerCase() !== 'annulé')
    const pending = active.filter((o) =>
      ['en attente', 'en attente — rdv à planifier', 'en cours'].includes(o.status.toLowerCase())
    ).length
    const completed = orders.filter((o) =>
      ['livré', 'payé'].includes(o.status.toLowerCase()) || o.paid
    ).length
    const hostingCount = active.filter((o) => o.hosting).length

    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const last7Days = orders.filter((o) => {
      const date = parseDate(o.date)
      return date ? date.getTime() >= sevenDaysAgo : false
    }).length

    const revenuePotential = active.reduce(
      (sum, o) => sum + (parseAmount(o.amount) || 20 + (o.hosting ? 5 : 0)),
      0
    )
    const revenuePaid = active
      .filter((o) => o.paid)
      .reduce((sum, o) => sum + (parseAmount(o.amount) || 20 + (o.hosting ? 5 : 0)), 0)

    const kpis = {
      totalOrders: orders.length,
      pending,
      completed,
      revenuePotential,
      revenuePaid,
      hostingCount,
      hostingRate: active.length > 0 ? Math.round((hostingCount / active.length) * 100) : 0,
      visioCount: appointments.length,
      last7Days,
      questionnaires: questionnaires.length,
      clients: clients.length,
    }

    return NextResponse.json({
      success: true,
      source: 'google-sheets',
      orders,
      questionnaires,
      clients,
      appointments,
      conversations,
      kpis,
      warnings,
    })
  } catch (error) {
    console.error('[admin/dashboard] GET failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to load admin dashboard' },
      { status: 500 }
    )
  }
}
