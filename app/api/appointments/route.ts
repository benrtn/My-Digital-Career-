/**
 * GET  /api/appointments — list available slots
 * POST /api/appointments — book a slot, create a Calendar event, persist it, email the client
 */

import { NextResponse } from 'next/server'
import {
  createCalendarEvent,
  getGoogleCalendarBusySlots,
  isGoogleCalendarConfigured,
} from '@/lib/googleCalendar'
import { saveAppointmentToSheets } from '@/lib/googleSheets'
import {
  readAppointmentsFromSheets,
  appendAppointmentToSheets,
} from '@/lib/sheetsApi'
import type { SheetAppointmentRecord } from '@/lib/sheetsApi'

export const runtime = 'nodejs'

const DAYS_AHEAD = 10
const DURATION_MINUTES = 60
const BUSINESS_HOURS = { start: 7, end: 22 }
const TIMEZONE = 'Europe/Paris'

// ---------------------------------------------------------------------------
// Timezone helpers
// ---------------------------------------------------------------------------

  if (!error || typeof error !== 'object') {
    return fallback
  }

  const details = error as {
    code?: number | string
    status?: number
    message?: string
    cause?: {
      reason?: string
      message?: string
      errors?: Array<{ reason?: string }>
      details?: Array<{ reason?: string }>
    }
  }

  const numericStatus =
    typeof details.status === 'number'
      ? details.status
      : typeof details.code === 'number'
        ? details.code
        : undefined

  const rawMessage = `${details.message ?? ''} ${details.cause?.message ?? ''}`.toLowerCase()
  const reason =
    details.cause?.reason ||
    details.cause?.errors?.find((item) => item.reason)?.reason ||
    details.cause?.details?.find((item) => item.reason)?.reason ||
    ''

  if (
    rawMessage.includes('calendar api has not been used') ||
    rawMessage.includes('accessnotconfigured') ||
    reason === 'SERVICE_DISABLED' ||
    reason === 'accessNotConfigured'
  ) {
    return {
      status: 503,
      message:
        'Google Calendar n’est pas encore activé sur le projet Google du service account. Activez l’API Google Calendar dans Google Cloud puis réessayez.',
    }
  }

  if (
    numericStatus === 404 ||
    rawMessage.includes('not found') ||
    rawMessage.includes('requested entity was not found')
  ) {
    return {
      status: 503,
      message:
        'Le calendrier Google configuré est introuvable ou non partagé avec le compte de service.',
    }
  }

  if (
    numericStatus === 403 ||
    rawMessage.includes('forbidden') ||
    rawMessage.includes('insufficient permissions')
  ) {
    return {
      status: 503,
      message:
        'Le compte de service Google n’a pas accès au calendrier configuré. Partagez le calendrier avec son adresse e-mail puis réessayez.',
    }
  }

  if (
    numericStatus === 401 ||
    rawMessage.includes('invalid_grant') ||
    rawMessage.includes('invalid jwt') ||
    rawMessage.includes('jwt')
  ) {
    return {
      status: 503,
      message:
        'Les identifiants Google du service account sont invalides ou expirés.',
    }
  }

  return fallback
}

function getParisDate(date: Date): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  return {
    year: parseInt(parts.find((part) => part.type === 'year')!.value, 10),
    month: parseInt(parts.find((part) => part.type === 'month')!.value, 10),
    day: parseInt(parts.find((part) => part.type === 'day')!.value, 10),
    hour: parseInt(parts.find((part) => part.type === 'hour')!.value, 10),
    minute: parseInt(parts.find((part) => part.type === 'minute')!.value, 10),
  }
}

function parisTimeToUTC(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0
): Date {
  const rough = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const parisHour = getParisDate(rough).hour
  const diff = parisHour - hour
  return new Date(rough.getTime() - diff * 60 * 60 * 1000)
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIMEZONE,
  })
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIMEZONE,
  })
}

// ---------------------------------------------------------------------------
// Overlap check
// ---------------------------------------------------------------------------

function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB
}

// ---------------------------------------------------------------------------
// Slot generation — uses Sheets appointments + Google Calendar busy slots
// ---------------------------------------------------------------------------

async function buildSlots(appointments: SheetAppointmentRecord[]) {
  const now = new Date()
  const minBookingTime = now.getTime() + 24 * 60 * 60 * 1000

  const parisToday = getParisDate(now)
  const windowStart = parisTimeToUTC(
    parisToday.year,
    parisToday.month,
    parisToday.day + 1,
    BUSINESS_HOURS.start
  )

  const windowEndParts = getParisDate(new Date(now.getTime() + DAYS_AHEAD * 86_400_000))
  const windowEnd = parisTimeToUTC(
    windowEndParts.year,
    windowEndParts.month,
    windowEndParts.day,
    BUSINESS_HOURS.end
  )

  const googleBusyRaw = await getGoogleCalendarBusySlots(windowStart, windowEnd)
  const googleBusy = googleBusyRaw.map((slot) => ({
    start: new Date(slot.start),
    end: new Date(slot.end),
  }))

  const slots: Array<{
    id: string
    startAt: string
    endAt: string
    dateLabel: string
    timeLabel: string
    durationMinutes: number
    available: boolean
  }> = []

  for (let dayOffset = 1; dayOffset <= DAYS_AHEAD; dayOffset += 1) {
    const referenceDate = new Date(now.getTime() + dayOffset * 86_400_000)
    const paris = getParisDate(referenceDate)

    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour += 1) {
      const startDate = parisTimeToUTC(paris.year, paris.month, paris.day, hour)
      const endDate = new Date(startDate.getTime() + DURATION_MINUTES * 60 * 1000)

      const tooSoon = startDate.getTime() < minBookingTime
      const conflictsWithLocal = appointments.some((item) =>
        overlaps(startDate, endDate, new Date(item.startAt), new Date(item.endAt))
      )
      const conflictsWithGoogle = googleBusy.some((busy) =>
        overlaps(startDate, endDate, busy.start, busy.end)
      )

      slots.push({
        id: `${startDate.toISOString()}-${DURATION_MINUTES}`,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        dateLabel: formatDateLabel(startDate),
        timeLabel: `${formatTimeLabel(startDate)} - ${formatTimeLabel(endDate)}`,
        durationMinutes: DURATION_MINUTES,
        available: !tooSoon && !conflictsWithLocal && !conflictsWithGoogle,
      })
    }
  }

  return slots
}

export async function GET(request: Request) {
  try {
    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Calendar non configuré. Vérifiez GOOGLE_SERVICE_ACCOUNT_JSON et GOOGLE_CALENDAR_ID.',
          slots: [],
        },
        { status: 503 }
      )
    }

    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')?.trim().toLowerCase()
    const appointments = await readAppointmentsFromSheets()

    if (email) {
      const appointment = appointments
        .filter((item) => item.email.toLowerCase() === email)
        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())[0]

      return NextResponse.json({
        success: true,
        appointment: appointment || null,
      })
    }

    const slots = await buildSlots(appointments)

    return NextResponse.json({
      success: true,
      timezone: TIMEZONE,
      appointments: adminSession ? appointments : undefined,
      slots,
    })
  } catch (error) {
    console.error('[appointments] GET failed:', error)
    const calendarError = extractCalendarError(error)
    return NextResponse.json(
      { success: false, error: calendarError.message, slots: [] },
      { status: calendarError.status }
    )
  }
}

export async function POST(request: Request) {
  try {
    if (!isGoogleCalendarConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Google Calendar non configuré. Vérifiez GOOGLE_SERVICE_ACCOUNT_JSON et GOOGLE_CALENDAR_ID.',
        },
        { status: 503 }
      )
    }

    if (!isGoogleSheetsConfigured() && !isAppsScriptConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Aucune persistance Google configurée pour les rendez-vous. Vérifiez GOOGLE_SPREADSHEET_ID ou GOOGLE_APPS_SCRIPT_URL.',
        },
        { status: 503 }
      )
    }

    const body = (await request.json()) as {
      email?: string
      firstName?: string
      lastName?: string
      startAt?: string
      orderId?: string
    }

    const email = body.email?.trim().toLowerCase() || ''
    const firstName = body.firstName?.trim() || ''
    const lastName = body.lastName?.trim() || ''
    const startAt = body.startAt?.trim() || ''
    const orderId = body.orderId?.trim() || ''

    if (!email || !firstName || !lastName || !startAt) {
      return NextResponse.json(
        { success: false, error: 'Missing appointment data' },
        { status: 400 }
      )
    }

    const startDate = new Date(startAt)
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json(
        { success: false, error: 'Invalid appointment date' },
        { status: 400 }
      )
    }

    const minBookingTime = Date.now() + 24 * 60 * 60 * 1000
    if (startDate.getTime() < minBookingTime) {
      return NextResponse.json(
        { success: false, error: 'Appointment must be at least 24h ahead' },
        { status: 400 }
      )
    }

    const endDate = new Date(startDate.getTime() + DURATION_MINUTES * 60 * 1000)
    const appointments = await readAppointmentsFromSheets()

    const conflictsWithAppointment = appointments.some((item) =>
      overlaps(startDate, endDate, new Date(item.startAt), new Date(item.endAt))
    )

    const googleBusyRaw = await getGoogleCalendarBusySlots(startDate, endDate)
    const conflictsWithGoogle = googleBusyRaw.some((busy) =>
      overlaps(startDate, endDate, new Date(busy.start), new Date(busy.end))
    )

    if (conflictsWithLocal || conflictsWithGoogle) {
      return NextResponse.json(
        { success: false, error: 'Slot already booked' },
        { status: 409 }
      )
    }

    const clientName = `${firstName} ${lastName}`.trim()
    const calendarResult = await createCalendarEvent({
      summary: `My Digital Career — RDV ${clientName}`,
      description: [
        `Client : ${clientName}`,
        `Email : ${email}`,
        `Durée : ${DURATION_MINUTES} min`,
        orderId ? `Commande : ${orderId}` : '',
        'Réservé via mydigitalcareer.com',
      ]
        .filter(Boolean)
        .join('\n'),
      startUtc: startDate.toISOString(),
      endUtc: endDate.toISOString(),
      attendeeEmail: email,
    })

    const record: SheetAppointmentRecord & { orderId: string } = {
      id: `rdv-${Date.now()}`,
      email,
      firstName,
      lastName,
      startAt: startDate.toISOString(),
      endAt: endDate.toISOString(),
      durationMinutes: DURATION_MINUTES,
      mode: 'google_meet',
      meetLink: calendarResult.meetLink ?? undefined,
      eventId: calendarResult.eventId,
      orderId: orderId || undefined,
      createdAt: new Date().toISOString(),
      orderId,
    }

    // Write to Google Sheets (primary store)
    await appendAppointmentToSheets(record)

    // Sync to Apps Script for Discord notification (non-blocking)
    saveAppointmentToSheets({
      id: record.id,
      email,
      firstName,
      lastName,
      email,
      dateLabel,
      timeLabel,
      meetLink: calendarResult.meetLink ?? undefined,
      eventId: calendarResult.eventId ?? undefined,
      orderId,
      createdAt: record.createdAt,
      dateLabel: formatDateLabel(startDate),
      timeLabel: `${formatTimeLabel(startDate)} - ${formatTimeLabel(endDate)}`,
    }).catch((err) => console.warn('[appointments] Apps Script sync failed:', err))

    return NextResponse.json({
      success: true,
      appointment: record,
      meetLink: calendarResult.meetLink,
      warnings,
    })
  } catch (error) {
    console.error('[appointments] POST failed:', error)
    const calendarError = extractCalendarError(error)
    return NextResponse.json(
      { success: false, error: calendarError.message },
      { status: calendarError.status }
    )
  }
}
