import { googleConfig } from '@/config/google'
import type { QuestionnaireData, ChatMessage, QuestionnaireUpload } from '@/types'

interface ApiResult {
  success: boolean
  data?: Record<string, unknown>
  error?: string
}

// ─────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────

async function postApi(payload: Record<string, unknown>): Promise<ApiResult> {
  const endpoint = googleConfig.appsScriptUrl

  if (!endpoint) {
    console.info('[GoogleSheets] Mode mock (aucune URL configurée) —', payload.action, payload)
    await new Promise((r) => setTimeout(r, 800))
    return { success: true, data: mockResponse(payload.action as string, payload) }
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    return { success: true, data: json }
  } catch (err) {
    console.error(`[GoogleSheets] POST error (${payload.action}):`, err)
    return { success: false, error: String(err) }
  }
}

async function getApi(params: Record<string, string>): Promise<ApiResult> {
  const endpoint = googleConfig.appsScriptUrl

  if (!endpoint) {
    console.info('[GoogleSheets] Mode mock GET —', params)
    await new Promise((r) => setTimeout(r, 600))
    return { success: true, data: mockResponse(params.action, params) }
  }

  try {
    const url = new URL(endpoint)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    const res = await fetch(url.toString())
    const json = await res.json()
    return { success: true, data: json }
  } catch (err) {
    console.error('[GoogleSheets] GET error:', err)
    return { success: false, error: String(err) }
  }
}

// ─────────────────────────────────────────────────
// Public API — Questionnaire
// ─────────────────────────────────────────────────

export async function submitQuestionnaire(
  data: QuestionnaireData,
  options?: { orderId?: string }
): Promise<ApiResult> {
  return postApi({
    action: 'submitQuestionnaire',
    orderId: options?.orderId || '',
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    password: data.password,
    profession: data.profession,
    seekingJob: data.seekingJob === null ? '' : data.seekingJob ? 'Oui' : 'Non',
    positionsSearched: data.positionsSearched.filter((p) => p.trim()).join(' | '),
    motivations: data.motivations.join(' | '),
    motivationOther: data.motivationOther,
    colorPalette: data.colorPalette,
    siteStyle: data.siteStyle,
    customRequestEnabled: data.customRequestEnabled === null ? '' : data.customRequestEnabled ? 'Oui' : 'Non',
    customRequest: data.customRequest,
    socialLinks: data.socialLinks
      .filter((l) => l.name && l.url)
      .map((l) => `${l.name.startsWith('other:') ? l.name.replace('other:', '') : l.name}: ${l.url}`)
      .join(' | '),
    cvFile: data.cvLink,
    photoFile: data.photoLink,
    extraFile: data.extraLink,
    cvUpload: data.cvFile
      ? {
          name: data.cvFile.name,
          mimeType: data.cvFile.mimeType,
          base64: data.cvFile.base64,
        }
      : null,
    photoUpload: data.photoFile
      ? {
          name: data.photoFile.name,
          mimeType: data.photoFile.mimeType,
          base64: data.photoFile.base64,
        }
      : null,
    extraUploads: (data.extraFiles ?? []).map((file) => ({
      name: file.name,
      mimeType: file.mimeType,
      base64: file.base64,
    })),
    authorization: data.authorization ? 'Oui' : 'Non',
    date: new Date().toISOString(),
  })
}

// ─────────────────────────────────────────────────
// Public API — Orders
// ─────────────────────────────────────────────────

export async function submitOrder(data: {
  firstName: string
  lastName: string
  email: string
  colorPalette: string
  siteStyle: string
  profession: string
  positionsSearched: string[]
  amount: string
  currency: string
}): Promise<ApiResult> {
  return postApi({
    action: 'submitOrder',
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    profession: data.profession,
    positionsSearched: data.positionsSearched.join(' | '),
    colorPalette: data.colorPalette,
    siteStyle: data.siteStyle,
    amount: data.amount,
    currency: data.currency,
    date: new Date().toISOString(),
    status: 'En attente',
    chatEnabled: 'Non',
    premierVersionEnvoyee: 'Non',
  })
}

// ─────────────────────────────────────────────────
// Public API — Client registration
// ─────────────────────────────────────────────────

export async function registerClient(data: {
  orderId?: string
  firstName?: string
  lastName?: string
  name?: string
  email: string
  password: string
  date?: string
}): Promise<ApiResult> {
  return postApi({
    action: 'registerClient',
    orderId: data.orderId || '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    name: data.name,
    email: data.email,
    password: data.password,
    date: data.date || new Date().toISOString(),
  })
}

// ─────────────────────────────────────────────────
// Public API — Chat
// ─────────────────────────────────────────────────

export async function sendChatMessage(data: {
  clientEmail: string
  clientName: string
  author: 'client' | 'admin'
  message: string
  adminKey?: string
  attachments?: QuestionnaireUpload[]
}): Promise<ApiResult> {
  return postApi({
    action: 'sendMessage',
    ...data,
    attachments: (data.attachments ?? []).map((file) => ({
      name: file.name,
      mimeType: file.mimeType,
      base64: file.base64,
    })),
    timestamp: new Date().toISOString(),
  })
}

export async function getChatMessages(clientEmail: string): Promise<{
  success: boolean
  messages: ChatMessage[]
}> {
  const result = await getApi({ action: 'getMessages', email: clientEmail })
  return {
    success: result.success,
    messages: (result.data?.messages as ChatMessage[]) ?? [],
  }
}

export async function checkChatEligibility(
  clientEmail: string
): Promise<{
  eligible: boolean
  clientName?: string
  orderStatus?: string
}> {
  const result = await getApi({ action: 'checkEligibility', email: clientEmail })
  if (!result.success) return { eligible: false }
  const d = result.data ?? {}
  return {
    eligible: Boolean(d.eligible),
    clientName: d.clientName as string | undefined,
    orderStatus: d.orderStatus as string | undefined,
  }
}

// ─────────────────────────────────────────────────
// Public API — Admin
// ─────────────────────────────────────────────────

export async function getAdminQuestionnaires(adminKey: string) {
  return getApi({ action: 'getQuestionnaires', adminKey })
}

export async function getAdminConversations(adminKey: string) {
  return getApi({ action: 'getAllConversations', adminKey })
}

export async function getAdminClients(adminKey: string) {
  return getApi({ action: 'getClients', adminKey })
}

export async function getAdminOrders(adminKey: string) {
  return getApi({ action: 'getOrders', adminKey })
}

export async function updateOrderStatus(data: {
  adminKey: string
  orderId: string
  status?: string
  chatEnabled?: boolean
  firstVersionSent?: boolean
  siteUrl?: string
}): Promise<ApiResult> {
  return postApi({ action: 'updateOrderStatus', ...data })
}

export async function sendFirstVersionEmail(data: {
  adminKey: string
  clientEmail: string
  clientName: string
  siteUrl?: string
}): Promise<ApiResult> {
  return postApi({ action: 'sendFirstVersionEmail', ...data })
}

export async function trackClientEvent(data: {
  email: string
  clientName?: string
  orderId?: string
  event: 'preview_viewed' | 'site_approved'
}): Promise<ApiResult> {
  return postApi({
    action: 'trackClientEvent',
    ...data,
    timestamp: new Date().toISOString(),
  })
}

// ─────────────────────────────────────────────────
// Public API — Emails
// ─────────────────────────────────────────────────

export async function sendAccountCreationEmail(data: {
  email: string
  name: string
  firstName?: string
  password: string
}): Promise<ApiResult> {
  return postApi({
    action: 'sendAccountCreationEmail',
    ...data,
  })
}

export async function sendOrderConfirmationEmail(data: {
  email: string
  name: string
  firstName?: string
  orderId?: string
  amount: string
  currency: string
  colorPalette?: string
  siteStyle?: string
}): Promise<ApiResult> {
  return postApi({
    action: 'sendOrderConfirmationEmail',
    ...data,
  })
}

export async function sendAppointmentConfirmationEmail(data: {
  email: string
  name: string
  firstName?: string
  dateLabel: string
  timeLabel: string
  meetLink?: string
  durationMinutes?: number
}): Promise<ApiResult> {
  return postApi({
    action: 'sendAppointmentConfirmationEmail',
    ...data,
  })
}

// ─────────────────────────────────────────────────
// Public API — Appointments (Sheets sync)
// ─────────────────────────────────────────────────

export async function saveAppointmentToSheets(data: {
  id: string
  email: string
  firstName: string
  lastName: string
  startAt: string
  endAt: string
  durationMinutes: number
  mode: string
  meetLink?: string
  eventId?: string
  orderId?: string
  createdAt: string
  dateLabel?: string
  timeLabel?: string
}): Promise<ApiResult> {
  return postApi({
    action: 'saveAppointment',
    ...data,
  })
}

// ─────────────────────────────────────────────────
function mockResponse(action: string, _params?: Record<string, unknown>): Record<string, unknown> {
  switch (action) {
    case 'getMessages':
      return { messages: [] }
    case 'checkEligibility':
      return { eligible: true, chatEnabled: true, clientName: 'Client démo' }
    case 'getAllConversations':
      return { conversations: [] }
    case 'getClients':
      return { clients: [] }
    case 'getOrders':
      return { orders: [] }
    case 'submitOrder':
      return { ok: true, orderId: 'EW-' + Date.now().toString().slice(-8) }
    default:
      return { ok: true }
  }
}
