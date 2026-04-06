/**
 * Analytics — GA4 event tracking layer.
 *
 * SETUP:
 * 1. Create a GA4 property at https://analytics.google.com
 * 2. Get your Measurement ID (G-XXXXXXXXXX)
 * 3. Add it to .env.local as NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
 * 4. The gtag script is loaded conditionally via the cookie consent layer
 *
 * All events are typed and tracked through this single module.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID || ''

export function pageview(url: string) {
  if (!GA_ID || typeof window === 'undefined' || !window.gtag) return
  window.gtag('config', GA_ID, { page_path: url })
}

type EventName =
  | 'cta_click'
  | 'questionnaire_open'
  | 'questionnaire_start'
  | 'questionnaire_step'
  | 'questionnaire_complete'
  | 'appointment_booked'
  | 'order_created'
  | 'payment_initiated'
  | 'conversion'
  | 'client_login'
  | 'client_preview_open'
  | 'client_site_approved'
  | 'contact_form_sent'
  | 'chat_opened'
  | 'chat_message_sent'
  | 'portfolio_viewed'
  | 'funnel_step'

interface EventParams {
  cta_click: { cta_name: string; page: string }
  questionnaire_open: { page: string }
  questionnaire_start: { page: string; source?: string }
  questionnaire_step: { step: number; step_name: string }
  questionnaire_complete: { profession: string }
  appointment_booked: { appointment_date: string; service_type?: string; page: string }
  order_created: { order_id: string; amount: string; currency: string }
  payment_initiated: { amount: string; currency: string }
  conversion: { order_id: string; value: string; currency: string }
  client_login: { method: string }
  client_preview_open: { client_id: string }
  client_site_approved: { client_id: string }
  contact_form_sent: Record<string, never>
  chat_opened: Record<string, never>
  chat_message_sent: { page: string; message_length?: number }
  portfolio_viewed: { item_id: string }
  funnel_step: { step: string; timestamp: string }
}

export function trackEvent<T extends EventName>(
  name: T,
  params: EventParams[T]
) {
  if (typeof window === 'undefined' || !window.gtag) {
    if (process.env.NODE_ENV === 'development') {
      console.info('[Analytics]', name, params)
    }
    return
  }
  window.gtag('event', name, params)
}

/** Track a step in the conversion funnel for the admin KPI dashboard. */
export function trackFunnelStep(
  step:
    | 'visit'
    | 'cta_click'
    | 'questionnaire_start'
    | 'questionnaire_complete'
    | 'appointment_booked'
    | 'payment'
    | 'conversion'
) {
  trackEvent('funnel_step', {
    step,
    timestamp: new Date().toISOString(),
  })
}
