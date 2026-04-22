/**
 * POST /api/questionnaire
 *
 * Server-side questionnaire submission.
 * - Keeps a single order ID across the whole checkout flow
 * - Writes to Google Sheets using the legacy "Questionnaire" tab schema
 * - Falls back to Apps Script if direct Sheets access is unavailable
 * - Returns explicit errors instead of silent success
 */

import { NextResponse } from 'next/server'
import {
  appendQuestionnaireRow,
  isGoogleSheetsConfigured,
} from '@/lib/googleSheetsApi'
import {
  isAppsScriptConfigured,
  submitQuestionnaireViaAppsScript,
} from '@/lib/googleAppsScript.server'
import { notifyNewQuestionnaire } from '@/lib/discord'
import { generateOrderId, formatDateFR } from '@/lib/orderUtils'
import { isValidEmail } from '@/lib/utils'
import type { QuestionnaireUpload } from '@/types'

export const runtime = 'nodejs'

interface QuestionnairePayload {
  orderId?: string
  firstName?: string
  lastName?: string
  email?: string
  profession?: string
  seekingJob?: string
  positionsSearched?: string
  motivation?: string
  colorPalette?: string
  siteStyle?: string
  customRequestEnabled?: string
  customRequest?: string
  socialLinks?: Array<{ name: string; url: string }>
  cvLink?: string
  photoLink?: string
  extraLinks?: string[]
  cvUpload?: QuestionnaireUpload | null
  photoUpload?: QuestionnaireUpload | null
  extraUploads?: QuestionnaireUpload[]
  authorization?: string
}

function formatSocialLinks(
  socialLinks: Array<{ name: string; url: string }> | undefined
): string {
  return (socialLinks ?? [])
    .filter((link) => link.name?.trim() && link.url?.trim())
    .map((link) => `${link.name.trim()}: ${link.url.trim()}`)
    .join(', ')
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QuestionnairePayload

    const firstName = body.firstName?.trim() || ''
    const lastName = body.lastName?.trim() || ''
    const email = body.email?.trim().toLowerCase() || ''

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { success: false, error: 'Nom, prénom et email requis' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Email invalide' },
        { status: 400 }
      )
    }

    const orderId = body.orderId?.trim() || generateOrderId()
    const dateLabel = formatDateFR()
    const socialLinks = formatSocialLinks(body.socialLinks)
    const extraLinks = (body.extraLinks ?? []).filter((value) => value?.trim()).join(', ')
    const customRequest =
      body.customRequestEnabled === 'Oui'
        ? body.customRequest?.trim() || 'Oui'
        : 'Non'
    const authorization = body.authorization?.trim() || 'Non'

    let storage: 'google-sheets' | 'apps-script' | null = null
    let writeError = ''

    if (isGoogleSheetsConfigured()) {
      const directWriteOk = await appendQuestionnaireRow({
        date: dateLabel,
        orderId,
        lastName,
        firstName,
        email,
        profession: body.profession?.trim() || '',
        seekingJob: body.seekingJob?.trim() || '',
        positionsSearched: body.positionsSearched?.trim() || '',
        motivation: body.motivation?.trim() || '',
        customRequest,
        colorPalette: body.colorPalette?.trim() || '',
        siteStyle: body.siteStyle?.trim() || '',
        socialLinks,
        cvLabel: body.cvLink?.trim() || '',
        photoLabel: body.photoLink?.trim() || '',
        extraLabel: extraLinks,
        authorization,
        cvUrl: body.cvLink?.trim() || '',
        photoUrl: body.photoLink?.trim() || '',
        extraUrl: extraLinks,
      })

      if (directWriteOk) {
        storage = 'google-sheets'
      } else {
        writeError = 'Écriture directe Google Sheets échouée'
        console.error('[questionnaire] Direct Google Sheets write failed')
      }
    }

    if (!storage && isAppsScriptConfigured()) {
      const fallbackResult = await submitQuestionnaireViaAppsScript({
        orderId,
        date: new Date().toISOString(),
        firstName,
        lastName,
        email,
        password: '',
        profession: body.profession?.trim() || '',
        seekingJob: body.seekingJob?.trim() || '',
        positionsSearched: body.positionsSearched?.trim() || '',
        motivations: body.motivation?.trim() || '',
        motivationOther: '',
        colorPalette: body.colorPalette?.trim() || '',
        siteStyle: body.siteStyle?.trim() || '',
        customRequestEnabled: body.customRequestEnabled?.trim() || '',
        customRequest,
        socialLinks,
        cvFile: body.cvLink?.trim() || '',
        photoFile: body.photoLink?.trim() || '',
        extraFile: extraLinks,
        cvUpload: body.cvUpload ?? null,
        photoUpload: body.photoUpload ?? null,
        extraUploads: body.extraUploads ?? [],
        authorization,
      })

      if (fallbackResult.success) {
        storage = 'apps-script'
      } else {
        writeError = fallbackResult.error || writeError || 'Fallback Apps Script failed'
        console.error('[questionnaire] Apps Script fallback failed:', fallbackResult.error)
      }
    }

    if (!storage) {
      const configurationError =
        writeError ||
        'Google Sheets non configuré. Vérifiez GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SPREADSHEET_ID et/ou GOOGLE_APPS_SCRIPT_URL.'

      return NextResponse.json(
        { success: false, error: configurationError },
        { status: writeError ? 502 : 503 }
      )
    }

    notifyNewQuestionnaire({
      orderId,
      firstName,
      lastName,
      email,
      profession: body.profession?.trim() || '',
      colorPalette: body.colorPalette?.trim() || '',
      siteStyle: body.siteStyle?.trim() || '',
    }).catch((error) => {
      console.warn('[questionnaire] Discord notification failed:', error)
    })

    return NextResponse.json({
      success: true,
      orderId,
      storage,
    })
  } catch (error) {
    console.error('[questionnaire] POST failed:', error)
    return NextResponse.json(
      { success: false, error: 'Questionnaire submission failed' },
      { status: 500 }
    )
  }
}
