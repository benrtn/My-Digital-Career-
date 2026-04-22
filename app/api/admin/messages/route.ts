import { NextResponse } from 'next/server'
import { sendChatMessage } from '@/lib/googleSheets'
import { getAdminSessionFromRequest, getRequiredAdminKey } from '@/lib/session.server'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await getAdminSessionFromRequest(request)
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const body = (await request.json()) as {
      clientEmail?: string
      clientName?: string
      message?: string
    }

    const clientEmail = body.clientEmail?.trim().toLowerCase() || ''
    const clientName = body.clientName?.trim() || ''
    const message = body.message?.trim() || ''

    if (!clientEmail || !message) {
      return NextResponse.json(
        { success: false, error: 'Client email and message are required' },
        { status: 400 }
      )
    }

    const result = await sendChatMessage({
      clientEmail,
      clientName,
      author: 'admin',
      message,
      adminKey: getRequiredAdminKey(),
    })

    return NextResponse.json(result, {
      status: result.success ? 200 : 502,
    })
  } catch (error) {
    console.error('[admin/messages] POST failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send admin message' },
      { status: 500 }
    )
  }
}
