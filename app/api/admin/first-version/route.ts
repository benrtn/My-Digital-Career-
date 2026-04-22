import { NextResponse } from 'next/server'
import { sendFirstVersionEmail } from '@/lib/googleSheets'
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
      siteUrl?: string
    }

    const clientEmail = body.clientEmail?.trim().toLowerCase() || ''
    const clientName = body.clientName?.trim() || ''

    if (!clientEmail || !clientName) {
      return NextResponse.json(
        { success: false, error: 'Client email and name are required' },
        { status: 400 }
      )
    }

    const result = await sendFirstVersionEmail({
      adminKey: getRequiredAdminKey(),
      clientEmail,
      clientName,
      siteUrl: body.siteUrl?.trim() || '',
    })

    return NextResponse.json(result, {
      status: result.success ? 200 : 502,
    })
  } catch (error) {
    console.error('[admin/first-version] POST failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to send first version email' },
      { status: 500 }
    )
  }
}
