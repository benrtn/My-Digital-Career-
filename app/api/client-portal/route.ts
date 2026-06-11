/**
 * GET /api/client-portal
 *
 * Single authenticated call that powers the client area ("Mon site").
 * Auth: HttpOnly session cookie (see /api/client-auth).
 *
 * Returns the full client state from Google Sheets (source of truth):
 *   - order: status / paid / hosting / siteUrl / firstVersionSent / meet info
 *   - appointment: latest booked Google Meet slot
 *   - downloads: local deliverable files when present (ZIP / preview)
 */

import { NextResponse } from 'next/server'
import {
  findLatestOrderByEmail,
  getOrderByOrderId,
  isGoogleSheetsConfigured,
} from '@/lib/googleSheetsApi'
import { readAppointmentsFromSheets } from '@/lib/sheetsApi'
import { findClientFolder } from '@/lib/clientDownloads.server'
import { getClientSessionFromRequest } from '@/lib/session.server'

export const runtime = 'nodejs'

function normalize(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function isYes(value: string | undefined): boolean {
  const v = normalize(value)
  return v === 'oui' || v === 'yes' || v === 'true'
}

export async function GET(request: Request) {
  const session = await getClientSessionFromRequest(request)
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const email = session.sub.trim().toLowerCase()

  try {
    const [order, appointments, downloads] = await Promise.all([
      isGoogleSheetsConfigured()
        ? (session.orderId
            ? getOrderByOrderId(session.orderId).then(
                (found) => found ?? findLatestOrderByEmail(email)
              )
            : findLatestOrderByEmail(email))
        : Promise.resolve(null),
      readAppointmentsFromSheets().catch(() => []),
      findClientFolder({ email }).catch(() => null),
    ])

    const appointment = appointments
      .filter((item) => item.email === email)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())[0] ?? null

    const status = order?.status ?? ''
    const paid = isYes(order?.paid)
    const firstVersionSent =
      isYes(order?.firstVersionSent) ||
      ['première version', 'revision', 'révision', 'validé', 'livré', 'payé'].includes(normalize(status))

    return NextResponse.json({
      success: true,
      portal: {
        name: session.name,
        email,
        order: order
          ? {
              orderId: order.orderId,
              date: order.date,
              status,
              paid,
              hosting: isYes(order.hosting),
              amount: order.amount ?? '',
              siteUrl: order.siteUrl ?? '',
              firstVersionSent,
              meetTime: order.meetTime && order.meetTime !== 'En attente' ? order.meetTime : '',
              meetLink: order.meetLink && order.meetLink !== 'En attente' ? order.meetLink : '',
            }
          : null,
        appointment,
        downloads,
      },
    })
  } catch (error) {
    console.error('[client-portal] GET failed:', error)
    return NextResponse.json(
      { success: false, error: 'Portal lookup failed' },
      { status: 500 }
    )
  }
}
