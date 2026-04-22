/**
 * POST /api/payment/webhook
 *
 * Manual placeholder until Stripe is fully wired:
 * - updates the payment state in "Suivie des commandes"
 * - sends the payment confirmation email through Apps Script
 * - emits explicit warnings when non-blocking steps fail
 */

import { NextResponse } from 'next/server'
import {
  isGoogleSheetsConfigured,
  updateOrderPaymentStatus,
} from '@/lib/googleSheetsApi'
import {
  isAppsScriptConfigured,
  sendPaymentConfirmationEmailViaAppsScript,
} from '@/lib/googleAppsScript.server'
import { notifyPaymentReceived } from '@/lib/discord'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: string
      orderId?: string
      firstName?: string
      lastName?: string
      email?: string
      amount?: string
      currency?: string
    }

    if (body.type !== 'payment_success') {
      return NextResponse.json({ success: true, received: true })
    }

    const orderId = body.orderId?.trim() || ''
    const firstName = body.firstName?.trim() || ''
    const lastName = body.lastName?.trim() || ''
    const email = body.email?.trim().toLowerCase() || ''
    const amount = body.amount?.trim() || ''
    const currency = body.currency?.trim() || '€'

    if (!orderId || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing orderId or email' },
        { status: 400 }
      )
    }

    if (!isGoogleSheetsConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Sheets non configuré. Vérifiez GOOGLE_SERVICE_ACCOUNT_JSON et GOOGLE_SPREADSHEET_ID.',
        },
        { status: 503 }
      )
    }

    const updated = await updateOrderPaymentStatus(orderId, 'Oui', 'Payé')
    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: `Impossible de mettre à jour le paiement pour la commande ${orderId}`,
        },
        { status: 502 }
      )
    }

    const warnings: string[] = []

    if (isAppsScriptConfigured()) {
      const emailResult = await sendPaymentConfirmationEmailViaAppsScript({
        email,
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        orderId,
        amount,
        currency,
      })

      if (!emailResult.success) {
        warnings.push(`Email de confirmation de paiement: ${emailResult.error || 'échec inconnu'}`)
      }
    } else {
      warnings.push('Email de confirmation de paiement non envoyé: GOOGLE_APPS_SCRIPT_URL manquant')
    }

    const discordSent = await notifyPaymentReceived({
      orderId,
      firstName,
      lastName,
      email,
      amount,
      currency,
    })

    if (!discordSent) {
      console.warn('[payment/webhook] Discord notification failed')
    }

    return NextResponse.json({
      success: true,
      orderId,
      warnings,
    })
  } catch (error) {
    console.error('[payment/webhook] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
