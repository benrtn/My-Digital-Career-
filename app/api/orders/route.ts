/**
 * POST /api/orders
 *
 * Server-side order creation.
 * - Reuses the questionnaire order ID
 * - Persists the order and client credentials in Google Sheets
 * - Falls back to Apps Script if direct Sheets access is unavailable
 * - Triggers account/order emails with explicit warnings when they fail
 */

import { NextResponse } from 'next/server'
import {
  appendClientIdRow,
  appendOrderRow,
  isGoogleSheetsConfigured,
} from '@/lib/googleSheetsApi'
import {
  isAppsScriptConfigured,
  registerClientViaAppsScript,
  sendAccountCreationEmailViaAppsScript,
  sendOrderConfirmationEmailViaAppsScript,
  submitOrderViaAppsScript,
} from '@/lib/googleAppsScript.server'
import { notifyClientAccountCreated, notifyNewOrder } from '@/lib/discord'
import { hashPassword, createClientToken } from '@/lib/auth'
import { generateOrderId, formatDateFR } from '@/lib/orderUtils'
import { isValidEmail } from '@/lib/utils'

export const runtime = 'nodejs'

interface OrderPayload {
  orderId?: string
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  profession?: string
  positionsSearched?: string
  colorPalette?: string
  siteStyle?: string
  amount?: string
  currency?: string
  skipAppointment?: boolean
  authorization?: string
  cookiesAccepted?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OrderPayload

    const firstName = body.firstName?.trim() || ''
    const lastName = body.lastName?.trim() || ''
    const email = body.email?.trim().toLowerCase() || ''
    const password = body.password?.trim() || ''
    const amount = body.amount?.trim() || ''
    const currency = body.currency?.trim() || '€'
    const positionsSearched = body.positionsSearched?.trim() || ''

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Email invalide' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      )
    }

    const orderId = body.orderId?.trim() || generateOrderId()
    const date = formatDateFR()
    const status = body.skipAppointment ? 'En attente — RDV à planifier' : 'En attente'
    const passwordHash = await hashPassword(password)

    let persistence: 'google-sheets' | 'apps-script' | 'mixed' | null = null
    let persistenceError = ''
    let orderSavedDirectly = false
    let clientSavedDirectly = false

    if (isGoogleSheetsConfigured()) {
      orderSavedDirectly = await appendOrderRow({
        orderId,
        date,
        lastName,
        firstName,
        email,
        status,
        paid: 'Non',
      })

      clientSavedDirectly = orderSavedDirectly
        ? await appendClientIdRow({
            orderId,
            date,
            lastName,
            firstName,
            email,
            password,
            passwordHash,
            authorization: body.authorization?.trim() || '',
            cookiesAccepted: body.cookiesAccepted?.trim() || '',
          })
        : false

      if (orderSavedDirectly && clientSavedDirectly) {
        persistence = 'google-sheets'
      } else {
        persistenceError = 'Écriture directe Google Sheets échouée'
        console.error('[orders] Direct Google Sheets persistence failed', {
          orderSavedDirectly,
          clientSavedDirectly,
          orderId,
        })
      }
    }

    if (!persistence && isAppsScriptConfigured()) {
      const orderResult = orderSavedDirectly
        ? { success: true }
        : await submitOrderViaAppsScript({
            orderId,
            date: new Date().toISOString(),
            firstName,
            lastName,
            email,
            profession: body.profession?.trim() || '',
            positionsSearched,
            colorPalette: body.colorPalette?.trim() || '',
            siteStyle: body.siteStyle?.trim() || '',
            amount,
            currency,
            status,
            chatEnabled: 'Non',
            premierVersionEnvoyee: 'Non',
            siteUrl: '',
          })

      const clientResult = clientSavedDirectly
        ? { success: true }
        : await registerClientViaAppsScript({
            orderId,
            date: new Date().toISOString(),
            firstName,
            lastName,
            email,
            password: passwordHash,
          })

      if (orderResult.success && clientResult.success) {
        persistence =
          orderSavedDirectly || clientSavedDirectly
            ? 'mixed'
            : 'apps-script'
      } else {
        const orderFallbackError = 'error' in orderResult ? orderResult.error : undefined
        const clientFallbackError = 'error' in clientResult ? clientResult.error : undefined

        persistenceError =
          clientFallbackError ||
          orderFallbackError ||
          persistenceError ||
          'Apps Script fallback failed'

        console.error('[orders] Apps Script fallback failed', {
          orderResult,
          clientResult,
          orderId,
        })
      }
    }

    if (!persistence) {
      return NextResponse.json(
        {
          success: false,
          error:
            persistenceError ||
            'Google Sheets non configuré. Vérifiez GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SPREADSHEET_ID et/ou GOOGLE_APPS_SCRIPT_URL.',
        },
        { status: persistenceError ? 502 : 503 }
      )
    }

    const token = await createClientToken({
      email,
      name: `${firstName} ${lastName}`.trim(),
      orderId,
    })

    const warnings: string[] = []

    if (isAppsScriptConfigured()) {
      const emailResults = await Promise.allSettled([
        sendAccountCreationEmailViaAppsScript({
          email,
          name: `${firstName} ${lastName}`.trim(),
          firstName,
          password,
        }),
        sendOrderConfirmationEmailViaAppsScript({
          email,
          name: `${firstName} ${lastName}`.trim(),
          firstName,
          orderId,
          amount,
          currency,
          colorPalette: body.colorPalette?.trim() || '',
          siteStyle: body.siteStyle?.trim() || '',
        }),
      ])

      emailResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          warnings.push(
            index === 0
              ? 'Email de création de compte non envoyé'
              : 'Email de confirmation de commande non envoyé'
          )
          return
        }

        if (!result.value.success) {
          warnings.push(
            index === 0
              ? `Email de création de compte: ${result.value.error || 'échec inconnu'}`
              : `Email de confirmation de commande: ${result.value.error || 'échec inconnu'}`
          )
        }
      })
    } else {
      warnings.push('Emails automatiques désactivés: GOOGLE_APPS_SCRIPT_URL manquant')
    }

    const discordResults = await Promise.allSettled([
      notifyNewOrder({
        orderId,
        firstName,
        lastName,
        email,
        amount,
        currency,
      }),
      notifyClientAccountCreated({
        orderId,
        firstName,
        lastName,
        email,
      }),
    ])

    discordResults.forEach((result, index) => {
      if (result.status === 'rejected' || (result.status === 'fulfilled' && !result.value)) {
        console.warn(
          index === 0
            ? '[orders] Discord order notification failed'
            : '[orders] Discord account notification failed'
        )
      }
    })

    return NextResponse.json({
      success: true,
      orderId,
      token,
      persistence,
      warnings,
    })
  } catch (error) {
    console.error('[orders] POST failed:', error)
    return NextResponse.json(
      { success: false, error: 'Order creation failed' },
      { status: 500 }
    )
  }
}
