/**
 * GET /api/admin/dashboard
 *
 * Reads directly from Google Sheets (source of truth).
 * Falls back to Apps Script getters only if direct Sheets is not configured.
 * Returns KPIs computed from the data.
 */

import { NextResponse } from 'next/server'
import {
  isGoogleSheetsConfigured,
  readAppointments,
  readClients,
  readCookieConsents,
  readOrders,
  readQuestionnaires,
} from '@/lib/googleSheetsApi'
import {
  getAdminClients,
  getAdminConversations,
  getAdminOrders,
  getAdminQuestionnaires,
} from '@/lib/googleSheets'
import { getAdminSessionFromRequest, getRequiredAdminKey } from '@/lib/session.server'

export const runtime = 'nodejs'

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
    if (isGoogleSheetsConfigured()) {
      // Primary path — direct Sheets (source of truth)
      const [orders, questionnaires, clients, appointments, cookieConsents] =
        await Promise.all([
          readOrders().catch((e) => {
            warnings.push('Commandes indisponibles')
            console.error('[admin/dashboard] orders failed:', e)
            return []
          }),
          readQuestionnaires().catch((e) => {
            warnings.push('Questionnaires indisponibles')
            console.error('[admin/dashboard] questionnaires failed:', e)
            return []
          }),
          readClients().catch((e) => {
            warnings.push('Clients indisponibles')
            console.error('[admin/dashboard] clients failed:', e)
            return []
          }),
          readAppointments().catch((e) => {
            warnings.push('Rendez-vous indisponibles')
            console.error('[admin/dashboard] appointments failed:', e)
            return []
          }),
          readCookieConsents().catch(() => []),
        ])

      // Conversations still come from Apps Script (chat isn't in direct Sheets schema)
      let conversations: unknown[] = []
      try {
        const adminKey = getRequiredAdminKey()
        const convResult = await getAdminConversations(adminKey)
        conversations = (convResult.data?.conversations as unknown[]) ?? []
      } catch {
        warnings.push('Conversations indisponibles')
      }

      const kpis = computeKpis({ orders, questionnaires, clients, appointments })

      return NextResponse.json({
        success: true,
        source: 'google-sheets',
        orders,
        questionnaires,
        clients,
        appointments,
        cookieConsents,
        conversations,
        kpis,
        warnings,
      })
    }

    // Fallback — Apps Script (when direct Sheets isn't configured)
    const adminKey = getRequiredAdminKey()
    const [conversationsResult, ordersResult, clientsResult, questionnairesResult] =
      await Promise.all([
        getAdminConversations(adminKey),
        getAdminOrders(adminKey),
        getAdminClients(adminKey),
        getAdminQuestionnaires(adminKey),
      ])

    if (!conversationsResult.success) warnings.push('Conversations admin indisponibles')
    if (!ordersResult.success) warnings.push('Commandes admin indisponibles')
    if (!clientsResult.success) warnings.push('Clients admin indisponibles')
    if (!questionnairesResult.success) warnings.push('Questionnaires admin indisponibles')

    const orders = (ordersResult.data?.orders as Record<string, string>[]) ?? []
    const questionnaires = (questionnairesResult.data?.questionnaires as Record<string, string>[]) ?? []
    const clients = (clientsResult.data?.clients as Record<string, string>[]) ?? []

    const kpis = computeKpis({ orders, questionnaires, clients, appointments: [] })

    return NextResponse.json({
      success: true,
      source: 'apps-script',
      conversations: (conversationsResult.data?.conversations as unknown[]) ?? [],
      orders,
      clients,
      questionnaires,
      appointments: [],
      cookieConsents: [],
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

function computeKpis(input: {
  orders: Record<string, string>[]
  questionnaires: Record<string, string>[]
  clients: Record<string, string>[]
  appointments: Record<string, string>[]
}) {
  const { orders, questionnaires, clients, appointments } = input

  const statusCounts: Record<string, number> = {}
  for (const order of orders) {
    const status = (order['Statut'] ?? order['status'] ?? '').trim() || 'Inconnu'
    statusCounts[status] = (statusCounts[status] ?? 0) + 1
  }

  const paidCount = orders.filter((o) => {
    const v = (o['Payé'] ?? o['paid'] ?? '').trim().toLowerCase()
    return v === 'oui' || v === 'yes' || v === 'true'
  }).length

  return {
    orders: orders.length,
    questionnaires: questionnaires.length,
    clients: clients.length,
    appointments: appointments.length,
    paid: paidCount,
    byStatus: statusCounts,
  }
}
