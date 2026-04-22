/**
 * POST /api/chat — Send a client message to Discord
 *
 * Messages are forwarded to Discord only (no Sheets storage).
 * Discord webhooks are one-way: site → Discord.
 *
 * LIMITATION: Admin replies from Discord won't appear on the site.
 * For bidirectional chat, a Discord bot is needed (not just webhooks).
 * Alternative: admin replies via the admin panel on the site.
 */

import { NextResponse } from 'next/server'
import { notifyChatMessage } from '@/lib/discord'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      clientEmail?: string
      clientName?: string
      message?: string
      orderId?: string
    }

    const clientEmail = body.clientEmail?.trim().toLowerCase() || ''
    const clientName = body.clientName?.trim() || ''
    const message = body.message?.trim() || ''

    if (!clientEmail || !message) {
      return NextResponse.json(
        { success: false, error: 'Email and message required' },
        { status: 400 }
      )
    }

    // Send to Discord only
    const sent = await notifyChatMessage({
      clientName,
      clientEmail,
      message,
      orderId: body.orderId,
    })

    if (!sent) {
      console.warn('[chat] Discord notification failed — webhook may not be configured')
    }

    return NextResponse.json({
      success: true,
      messageId: `msg-${Date.now()}`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[chat] POST failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
