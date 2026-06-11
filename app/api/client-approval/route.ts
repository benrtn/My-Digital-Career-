/**
 * POST /api/client-approval
 *
 * Called when the client approves their e-CV from the client area.
 * Auth: HttpOnly client session cookie.
 *
 * - Stamps the order status to "Validé" in Google Sheets (never deletes data)
 * - Notifies Discord so payment instructions can be sent
 */

import { NextResponse } from 'next/server'
import {
  findLatestOrderByEmail,
  getOrderByOrderId,
  isGoogleSheetsConfigured,
  updateOrderInSheets,
} from '@/lib/googleSheetsApi'
import { notifyClientApproval } from '@/lib/discord'
import { getClientSessionFromRequest } from '@/lib/session.server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await getClientSessionFromRequest(request)
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const email = session.sub.trim().toLowerCase()
  const warnings: string[] = []

  try {
    let orderId = session.orderId || ''

    if (isGoogleSheetsConfigured()) {
      const order = orderId
        ? (await getOrderByOrderId(orderId)) ?? (await findLatestOrderByEmail(email))
        : await findLatestOrderByEmail(email)

      if (order) {
        orderId = order.orderId
        // Don't downgrade an order that is already paid or delivered.
        const status = (order.status ?? '').trim().toLowerCase()
        if (!['payé', 'livré'].includes(status)) {
          const updated = await updateOrderInSheets(order.orderId, { status: 'Validé' })
          if (!updated) warnings.push('Statut Sheets non mis à jour')
        }
      } else {
        warnings.push('Commande introuvable dans Google Sheets')
      }
    }

    const notified = await notifyClientApproval({
      orderId: orderId || undefined,
      clientName: session.name,
      clientEmail: email,
    })
    if (!notified) warnings.push('Notification Discord non envoyée')

    return NextResponse.json({ success: true, orderId, warnings })
  } catch (error) {
    console.error('[client-approval] POST failed:', error)
    return NextResponse.json(
      { success: false, error: 'Approval failed' },
      { status: 500 }
    )
  }
}
