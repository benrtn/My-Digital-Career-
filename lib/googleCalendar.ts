/**
 * Google Calendar integration for My Digital Career
 *
 * Reads busy times and creates events with Google Meet links.
 * Requires a Service Account JSON key file at the project root
 * or credentials via environment variables.
 *
 * Timezone handling:
 * - Clients see slots in Europe/Paris (French time)
 * - The Google Calendar owner is in Asia/Bangkok (Thai time)
 * - All storage is in UTC; display conversions happen at the edges
 */

import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/calendar']
const PARIS_TZ = 'Europe/Paris'

// ── Auth ──────────────────────────────────────────────

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) return null

  try {
    const credentials = JSON.parse(raw)
    return new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: SCOPES,
    })
  } catch (err) {
    console.error('[GoogleCalendar] Failed to parse service account JSON:', err)
    return null
  }
}

function getCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || 'primary'
}

// ── Public API ────────────────────────────────────────

export interface BusySlot {
  start: string // ISO UTC
  end: string   // ISO UTC
}

/**
 * Fetch busy times from Google Calendar between two UTC dates.
 * Returns an empty array if credentials are not configured.
 */
export async function getGoogleCalendarBusySlots(
  timeMin: Date,
  timeMax: Date
): Promise<BusySlot[]> {
  const auth = getAuth()
  if (!auth) return []

  try {
    const calendar = google.calendar({ version: 'v3', auth })
    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone: 'UTC',
        items: [{ id: getCalendarId() }],
      },
    })

    const busy = res.data.calendars?.[getCalendarId()]?.busy ?? []
    return busy
      .filter((b): b is { start: string; end: string } => Boolean(b.start && b.end))
      .map((b) => ({ start: b.start!, end: b.end! }))
  } catch (err) {
    console.error('[GoogleCalendar] freebusy query failed:', err)
    return []
  }
}

/**
 * Create a Google Calendar event with a Google Meet link.
 * Returns the Meet link or null if creation fails.
 */
export async function createCalendarEvent(params: {
  summary: string
  description?: string
  startUtc: string // ISO UTC
  endUtc: string   // ISO UTC
  attendeeEmail?: string
}): Promise<{ meetLink: string | null; eventId: string | null }> {
  const auth = getAuth()
  if (!auth) return { meetLink: null, eventId: null }

  try {
    const calendar = google.calendar({ version: 'v3', auth })

    const event = await calendar.events.insert({
      calendarId: getCalendarId(),
      conferenceDataVersion: 1,
      requestBody: {
        summary: params.summary,
        description: params.description || '',
        start: {
          dateTime: params.startUtc,
          timeZone: PARIS_TZ,
        },
        end: {
          dateTime: params.endUtc,
          timeZone: PARIS_TZ,
        },
        attendees: params.attendeeEmail
          ? [{ email: params.attendeeEmail }]
          : undefined,
        conferenceData: {
          createRequest: {
            requestId: `mdc-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 60 },
            { method: 'popup', minutes: 15 },
          ],
        },
      },
    })

    return {
      meetLink: event.data.hangoutLink ?? null,
      eventId: event.data.id ?? null,
    }
  } catch (err) {
    console.error('[GoogleCalendar] event creation failed:', err)
    return { meetLink: null, eventId: null }
  }
}
