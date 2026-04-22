/**
 * POST /api/cookie-consent
 *
 * Persists cookie consent in the "Cookies" sheet AND (if the user is logged
 * in as a client) mirrors the choice in the "ID client" sheet's
 * "Cookies acceptés" column.
 *
 * Body: { analytics: boolean, payments: boolean, email?: string,
 *         firstName?: string, lastName?: string, orderId?: string }
 */

import { NextResponse } from 'next/server'
import {
  appendCookieRow,
  isGoogleSheetsConfigured,
  updateClientIdConsent,
} from '@/lib/googleSheetsApi'
import { getClientSessionFromRequest } from '@/lib/session.server'
import { formatDateFR } from '@/lib/orderUtils'
import { isValidEmail } from '@/lib/utils'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      analytics?: boolean
      payments?: boolean
      email?: string
      firstName?: string
      lastName?: string
      orderId?: string
    }

    const analytics = Boolean(body.analytics)
    const payments = Boolean(body.payments)

    // If the visitor is a logged-in client, trust the session email.
    const session = await getClientSessionFromRequest(request)
    const bodyEmail = body.email?.trim().toLowerCase() || ''
    const email = session?.sub || (bodyEmail && isValidEmail(bodyEmail) ? bodyEmail : '')

    if (!isGoogleSheetsConfigured()) {
      // Consent still applies client-side; we just can't persist it.
      return NextResponse.json({ success: true, persisted: false })
    }

    const date = formatDateFR()
    const choiceLabel = analytics && payments
      ? 'Tout accepté'
      : !analytics && !payments
        ? 'Refusé (essentiels uniquement)'
        : 'Personnalisé'

    const appended = await appendCookieRow({
      orderId: body.orderId?.trim() || '',
      date,
      email: email || 'anonyme',
      firstName: body.firstName?.trim() || session?.name?.split(' ')[0] || '',
      lastName: body.lastName?.trim() || session?.name?.split(' ').slice(1).join(' ') || '',
      essentials: true,
      analytics,
      payments,
    })

    // Mirror to ID client sheet if we know the email.
    if (email) {
      await updateClientIdConsent(email, { cookiesAccepted: choiceLabel }).catch(() => {
        // Row may not exist yet (visitor consented before creating account) — ignore
      })
    }

    return NextResponse.json({ success: true, persisted: appended })
  } catch (error) {
    console.error('[cookie-consent] POST failed:', error)
    return NextResponse.json(
      { success: false, error: 'Cookie consent persistence failed' },
      { status: 500 }
    )
  }
}
