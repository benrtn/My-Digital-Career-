/**
 * Server-side Google Apps Script bridge.
 *
 * We keep Apps Script for transactional emails and legacy fallback flows while
 * the main data writes go through direct Google APIs whenever possible.
 */

interface AppsScriptResponse<T = Record<string, unknown>> {
  success: boolean
  status: number
  data?: T
  error?: string
}

function getAppsScriptUrl(): string {
  return (
    process.env.GOOGLE_APPS_SCRIPT_URL?.trim() ||
    process.env.NEXT_PUBLIC_APPS_SCRIPT_URL?.trim() ||
    ''
  )
}

export function isAppsScriptConfigured(): boolean {
  return Boolean(getAppsScriptUrl())
}

async function callAppsScript<T = Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown>,
  fallbackAction?: string
): Promise<AppsScriptResponse<T>> {
  const endpoint = getAppsScriptUrl()
  if (!endpoint) {
    return {
      success: false,
      status: 503,
      error: 'GOOGLE_APPS_SCRIPT_URL not configured',
    }
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'text/plain;charset=utf-8',
      },
      cache: 'no-store',
      body: JSON.stringify({ action, ...payload }),
    })

    const text = await response.text()

    let json: Record<string, unknown> = {}
    if (text) {
      try {
        json = JSON.parse(text) as Record<string, unknown>
      } catch (error) {
        console.error(`[AppsScript] ${action} returned non-JSON:`, text)
        return {
          success: false,
          status: 502,
          error: `Apps Script returned invalid JSON for action "${action}"`,
        }
      }
    }

    const remoteError =
      typeof json.error === 'string'
        ? json.error
        : typeof json.message === 'string' && json.success === false
          ? json.message
          : ''

    if (remoteError && fallbackAction && /action inconnue/i.test(remoteError)) {
      console.warn(`[AppsScript] Falling back from "${action}" to "${fallbackAction}"`)
      return callAppsScript<T>(fallbackAction, payload)
    }

    if (!response.ok || remoteError) {
      console.error(`[AppsScript] ${action} failed:`, {
        status: response.status,
        error: remoteError || text,
      })

      return {
        success: false,
        status: response.ok ? 502 : response.status,
        data: json as T,
        error: remoteError || `Apps Script HTTP ${response.status}`,
      }
    }

    return {
      success: true,
      status: response.status,
      data: json as T,
    }
  } catch (error) {
    console.error(`[AppsScript] ${action} request failed:`, error)
    return {
      success: false,
      status: 502,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function submitQuestionnaireViaAppsScript(payload: Record<string, unknown>) {
  return callAppsScript('submitQuestionnaire', payload)
}

export async function submitOrderViaAppsScript(payload: Record<string, unknown>) {
  return callAppsScript('submitOrder', payload)
}

export async function registerClientViaAppsScript(payload: Record<string, unknown>) {
  return callAppsScript('registerClient', payload)
}

export async function saveAppointmentViaAppsScript(payload: Record<string, unknown>) {
  return callAppsScript('saveAppointment', payload)
}

export async function sendAccountCreationEmailViaAppsScript(payload: Record<string, unknown>) {
  return callAppsScript('sendAccountCreationEmail', payload)
}

export async function sendOrderConfirmationEmailViaAppsScript(payload: Record<string, unknown>) {
  return callAppsScript('sendOrderConfirmationEmail', payload)
}

export async function sendAppointmentConfirmationEmailViaAppsScript(payload: Record<string, unknown>) {
  return callAppsScript('sendAppointmentConfirmationEmail', payload)
}

export async function sendPaymentConfirmationEmailViaAppsScript(payload: Record<string, unknown>) {
  return callAppsScript('sendPaymentConfirmationEmail', payload, 'sendOrderConfirmationEmail')
}
