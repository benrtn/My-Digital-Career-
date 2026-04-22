/**
 * Google Calendar integration for My Digital Career.
 *
 * The booking UI works in Europe/Paris, but all API writes are stored in UTC
 * so the Calendar event stays consistent across timezones.
 */

import { google } from 'googleapis'

const SCOPES = ['https://www.googleapis.com/auth/calendar']

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!raw) {
    console.error('[GoogleCalendar] GOOGLE_SERVICE_ACCOUNT_JSON not set')
    return null
  }

  try {
    const credentials = JSON.parse(raw)
    return new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: SCOPES,
    })
  } catch (error) {
    console.error('[GoogleCalendar] Failed to parse service account JSON:', error)
    return null
  }
}

function getCalendarId(): string {
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim()
  if (!calendarId) {
    throw new Error(
      '[GoogleCalendar] GOOGLE_CALENDAR_ID not set. An explicit shared calendar ID is required.'
    )
  }

  return calendarId
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() &&
    process.env.GOOGLE_CALENDAR_ID?.trim()
  )
}

export interface BusySlot {
  start: string
  end: string
}

function isInvalidConferenceTypeError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const details = error as {
    message?: string
    cause?: {
      message?: string
    }
  }

  const raw = `${details.message ?? ''} ${details.cause?.message ?? ''}`.toLowerCase()
  return raw.includes('invalid conference type value')
}

async function insertCalendarEvent(
  calendar: ReturnType<typeof google.calendar>,
  calendarId: string,
  params: {
    summary: string
    description?: string
    startUtc: string
    endUtc: string
    attendeeEmail?: string
  },
  options?: {
    withConference?: boolean
  }
) {
  return calendar.events.insert({
    calendarId,
    conferenceDataVersion: options?.withConference ? 1 : 0,
    sendUpdates: params.attendeeEmail ? 'all' : 'none',
    requestBody: {
      summary: params.summary,
      description: params.description || '',
      start: {
        dateTime: params.startUtc,
        timeZone: 'UTC',
      },
      end: {
        dateTime: params.endUtc,
        timeZone: 'UTC',
      },
      attendees: params.attendeeEmail ? [{ email: params.attendeeEmail }] : undefined,
      conferenceData: options?.withConference
        ? {
            createRequest: {
              requestId: `mdc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              conferenceSolutionKey: {
                type: 'hangoutsMeet',
              },
            },
          }
        : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 60 },
          { method: 'popup', minutes: 15 },
        ],
      },
    },
  })
}

export async function getGoogleCalendarBusySlots(
  timeMin: Date,
  timeMax: Date
): Promise<BusySlot[]> {
  const auth = getAuth()
  if (!auth) {
    throw new Error('[GoogleCalendar] Missing service account credentials')
  }

  const calendarId = getCalendarId()

  try {
    const calendar = google.calendar({ version: 'v3', auth })
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        timeZone: 'UTC',
        items: [{ id: calendarId }],
      },
    })

    const busy = response.data.calendars?.[calendarId]?.busy ?? []
    return busy
      .filter((slot): slot is { start: string; end: string } => Boolean(slot.start && slot.end))
      .map((slot) => ({
        start: slot.start,
        end: slot.end,
      }))
  } catch (error) {
    console.error('[GoogleCalendar] freebusy query failed:', error)
    throw error
  }
}

export async function createCalendarEvent(params: {
  summary: string
  description?: string
  startUtc: string
  endUtc: string
  attendeeEmail?: string
}): Promise<{ meetLink: string | null; eventId: string | null }> {
  const auth = getAuth()
  if (!auth) {
    throw new Error('[GoogleCalendar] Missing service account credentials')
  }

  const calendarId = getCalendarId()

  try {
    const calendar = google.calendar({ version: 'v3', auth })
    let response

    try {
      response = await insertCalendarEvent(calendar, calendarId, params, { withConference: true })
    } catch (error) {
      if (!isInvalidConferenceTypeError(error)) {
        throw error
      }

      console.warn(
        '[GoogleCalendar] Conference creation not supported on this calendar. Retrying without Google Meet link.'
      )
      response = await insertCalendarEvent(calendar, calendarId, params, { withConference: false })
    }

    const meetLink =
      response.data.conferenceData?.entryPoints?.find(
        (entryPoint) => entryPoint.entryPointType === 'video'
      )?.uri ||
      response.data.hangoutLink ||
      null

    return {
      meetLink,
      eventId: response.data.id ?? null,
    }
  } catch (error) {
    console.error('[GoogleCalendar] event creation failed:', error)
    throw error
  }
}
