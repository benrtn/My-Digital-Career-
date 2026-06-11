/**
 * POST /api/admin/order-status
 *
 * Updates an order in Google Sheets (direct write — source of truth):
 * status, paid, siteUrl, firstVersionSent. Targeted cell updates only,
 * never deletes rows. Apps Script sync (chat flag) and Discord
 * notification are best-effort.
 * Auth: HttpOnly admin session cookie.
 */

import { NextResponse } from 'next/server'
import { isGoogleSheetsConfigured, updateOrderInSheets } from '@/lib/googleSheetsApi'
import { updateOrderStatus } from '@/lib/googleSheets'
import { notifyOrderStatusChanged } from '@/lib/discord'
import { getAdminSessionFromRequest, getRequiredAdminKey } from '@/lib/session.server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await getAdminSessionFromRequest(request)
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = (await request.json()) as {
      orderId?: string
      status?: string
      paid?: boolean
      chatEnabled?: boolean
      firstVersionSent?: boolean
      siteUrl?: string
    }

    const orderId = body.orderId?.trim() || ''
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID required' },
        { status: 400 }
      )
    }

    const warnings: string[] = []

    // Direct Sheets update (source of truth)
    if (isGoogleSheetsConfigured()) {
      const updated = await updateOrderInSheets(orderId, {
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.paid !== undefined ? { paid: body.paid ? 'Oui' : 'Non' } : {}),
        ...(body.siteUrl !== undefined ? { siteUrl: body.siteUrl } : {}),
        ...(body.firstVersionSent !== undefined
          ? { firstVersionSent: body.firstVersionSent ? 'Oui' : 'Non' }
          : {}),
      })
      if (!updated) warnings.push('Mise à jour Google Sheets échouée')
    } else {
      warnings.push('Google Sheets non configuré')
    }

    // Apps Script sync — needed for the chat flag and legacy flows (best-effort)
    if (body.chatEnabled !== undefined || body.status !== undefined) {
      try {
        await updateOrderStatus({
          adminKey: getRequiredAdminKey(),
          orderId,
          status: body.status,
          chatEnabled: body.chatEnabled,
          firstVersionSent: body.firstVersionSent,
          siteUrl: body.siteUrl,
        })
      } catch (err) {
        console.warn('[admin/order-status] Apps Script sync failed:', err)
        warnings.push('Synchronisation Apps Script échouée (chat)')
      }
    }

    // Discord notification (non-blocking)
    notifyOrderStatusChanged({
      orderId,
      status: body.status,
      paid: body.paid === undefined ? undefined : body.paid ? 'Oui' : 'Non',
      firstVersionSent: body.firstVersionSent,
      chatEnabled: body.chatEnabled,
    }).catch((err) => console.warn('[admin/order-status] Discord notify failed:', err))

    return NextResponse.json({ success: true, orderId, warnings })
  } catch (error) {
    console.error('[admin/order-status] POST failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update order status' },
      { status: 500 }
    )
  }
}
