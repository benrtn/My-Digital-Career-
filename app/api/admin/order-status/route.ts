import { NextResponse } from 'next/server'
import { updateOrderStatus } from '@/lib/googleSheets'
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
      orderId?: string
      status?: string
      chatEnabled?: boolean
      firstVersionSent?: boolean
      siteUrl?: string
    }

    const orderId = body.orderId?.trim() || ''
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID required' },
        { status: 400 }
      )
    }

    const result = await updateOrderStatus({
      adminKey: getRequiredAdminKey(),
      orderId,
      status: body.status,
      chatEnabled: body.chatEnabled,
      firstVersionSent: body.firstVersionSent,
      siteUrl: body.siteUrl,
    })

    return NextResponse.json(result, {
      status: result.success ? 200 : 502,
    })
  } catch (error) {
    console.error('[admin/order-status] POST failed:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update order status' },
      { status: 500 }
    )
  }
}
