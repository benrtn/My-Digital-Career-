import { NextResponse } from 'next/server'
import {
  getGoogleCalendarBusySlots,
  createCalendarEvent,
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
const BUSINESS_HOURS = { start: 7, end: 22 } // Europe/Paris wall-clock hours
const TIMEZONE = 'Europe/Paris'

// ---------------------------------------------------------------------------
// Timezone helpers
// ---------------------------------------------------------------------------

function getParisDate(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
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
    year: parseInt(parts.find((p) => p.type === 'year')!.value),
    month: parseInt(parts.find((p) => p.type === 'month')!.value),
    day: parseInt(parts.find((p) => p.type === 'day')!.value),
    hour: parseInt(parts.find((p) => p.type === 'hour')!.value),
    minute: parseInt(parts.find((p) => p.type === 'minute')!.value),
  }
}

function parisTimeToUTC(year: number, month: number, day: number, hour: number, minute: number = 0): Date {
  const rough = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const parisHour = getParisDate(rough).hour
  const diff = parisHour - hour
  return new Date(rough.getTime() - diff * 3600000)
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

  const parisTodayParts = getParisDate(now)
  const windowStart = parisTimeToUTC(parisTodayParts.year, parisTodayParts.month, parisTodayParts.day + 1, BUSINESS_HOURS.start)
  const windowEndParts = getParisDate(new Date(now.getTime() + DAYS_AHEAD * 86400000))
  const windowEnd = parisTimeToUTC(windowEndParts.year, windowEndParts.month, windowEndParts.day, BUSINESS_HOURS.end)

  const googleBusyRaw = await getGoogleCalendarBusySlots(windowStart, windowEnd)
  const googleBusy = googleBusyRaw.map((b) => ({
    start: new Date(b.start),
    end: new Date(b.end),
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

  for (let dayOffset = 1; dayOffset <= DAYS_AHEAD; dayOffset++) {
    const refDate = new Date(now.getTime() + dayOffset * 86400000)
    const paris = getParisDate(refDate)

    for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
      const startDate = parisTimeToUTC(paris.year, paris.month, paris.day, hour)
      const endDate = new Date(startDate.getTime() + DURATION_MINUTES * 60 * 1000)

      const pastMinBooking = startDate.getTime() < minBookingTime
      const conflictsWithAppointment = appointments.some((item) =>
        overlaps(startDate, endDate, new Date(item.startAt), new Date(item.endAt))
      )
      const conflictsWithGoogle = googleBusy.some((busy) =>
        overlaps(startDate, endDate, busy.start, busy.end)
      )

      const available = !pastMinBooking && !conflictsWithAppointment && !conflictsWithGoogle

      slots.push({
        id: `${startDate.toISOString()}-${DURATION_MINUTES}`,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        dateLabel: formatDateLabel(startDate),
        timeLabel: `${formatTimeLabel(startDate)} - ${formatTimeLabel(endDate)}`,
        durationMinutes: DURATION_MINUTES,
        available,
      })
    }
  }

  return slots
}

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  try {
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

    return NextResponse.json({
      success: true,
      appointments,
      slots: await buildSlots(appointments),
    })
  } catch (error) {
    console.error('[appointments] GET failed:', error)
    return NextResponse.json(
      { success: false, error: 'Appointment lookup failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
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

    if (conflictsWithAppointment || conflictsWithGoogle) {
      return NextResponse.json(
        { success: false, error: 'Slot already booked' },
        { status: 409 }
      )
    }

    const clientName = `${firstName} ${lastName}`.trim()
    let calendarResult: { meetLink?: string | null; eventId?: string | null } = {}

    if (isGoogleCalendarConfigured()) {
      try {
        calendarResult = await createCalendarEvent({
          summary: `My Digital Career — RDV ${clientName}`,
          description: [
            `Client : ${clientName}`,
            `Email : ${email}`,
            `Durée : ${DURATION_MINUTES} min`,
            `Réservé via mydigitalcareer.com`,
          ].join('\n'),
          startUtc: startDate.toISOString(),
          endUtc: endDate.toISOString(),
          attendeeEmail: email,
        })
      } catch (err) {
        console.warn('[appointments] Google Calendar event creation failed (non-blocking):', err)
      }
    } else {
      console.info('[appointments] Google Calendar not configured — skipping event creation')
    }

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
      eventId: calendarResult.eventId ?? undefined,
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
      startAt: record.startAt,
      endAt: record.endAt,
      durationMinutes: DURATION_MINUTES,
      mode: 'google_meet',
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
    })
  } catch (error) {
    console.error('[appointments] POST failed:', error)
    return NextResponse.json(
      { success: false, error: 'Appointment booking failed' },
      { status: 500 }
    )
  }
}
