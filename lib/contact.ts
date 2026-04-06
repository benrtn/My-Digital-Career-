import type { ContactFormData } from '@/types'
import { googleConfig } from '@/config/google'

export interface ContactResult {
  success: boolean
  message?: string
}

/**
 * Sends a contact form message.
 *
 * HOW TO CONNECT TO GOOGLE APPS SCRIPT:
 * 1. Create a Google Apps Script project at script.google.com
 * 2. Add a doPost(e) function that reads the JSON body and emails you
 * 3. Deploy as a Web App (Execute as: Me, Access: Anyone)
 * 4. Copy the /exec URL into .env.local → NEXT_PUBLIC_APPS_SCRIPT_URL
 *
 * When appsScriptUrl is empty, the function runs in mock mode
 * and simulates a successful submission.
 */
export async function sendContactForm(data: ContactFormData): Promise<ContactResult> {
  const endpoint = googleConfig.appsScriptUrl

  // Mock mode — no endpoint configured yet
  if (!endpoint) {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    console.info('[ContactForm] Mock submission:', data)
    return { success: true }
  }

  // Live mode — POST to Google Apps Script
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ action: 'contactForm', ...data }),
    })

    if (!res.ok) {
      return { success: false, message: `HTTP ${res.status}` }
    }

    return { success: true }
  } catch (err) {
    console.error('[ContactForm] Error:', err)
    return { success: false }
  }
}
