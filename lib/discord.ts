/**
 * Discord webhook notifications for My Digital Career
 *
 * Three webhook channels:
 *   1. Notifications — general order/payment events
 *   2. Questionnaires — new questionnaire submissions
 *   3. Chat — client messages (one-way from site → Discord)
 *
 * Environment variables:
 *   DISCORD_WEBHOOK_NOTIFICATIONS
 *   DISCORD_WEBHOOK_QUESTIONNAIRES
 *   DISCORD_WEBHOOK_CHAT
 */

interface DiscordEmbed {
  title?: string
  description?: string
  color?: number
  fields?: Array<{ name: string; value: string; inline?: boolean }>
  timestamp?: string
  footer?: { text: string }
}

async function sendWebhook(
  webhookUrl: string | undefined,
  content: string,
  embeds?: DiscordEmbed[]
): Promise<boolean> {
  if (!webhookUrl) {
    console.warn('[Discord] Webhook URL not configured — skipping')
    return false
  }

  try {
    const body: Record<string, unknown> = { content }
    if (embeds?.length) body.embeds = embeds

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error(`[Discord] Webhook failed (${res.status}):`, await res.text())
      return false
    }

    return true
  } catch (err) {
    console.error('[Discord] Webhook error:', err)
    return false
  }
}

// ── Notification channel ──────────────────────────

export async function notifyNewOrder(data: {
  orderId: string
  firstName: string
  lastName: string
  email: string
  amount: string
  currency: string
  hosting?: string
  appointment?: string
}): Promise<boolean> {
  const fields = [
    { name: 'N° Commande', value: data.orderId, inline: true },
    { name: 'Client', value: `${data.firstName} ${data.lastName}`, inline: true },
    { name: 'Email', value: data.email, inline: false },
    { name: 'Montant (à encaisser après validation)', value: `${data.amount} ${data.currency}`, inline: true },
  ]
  if (data.hosting) fields.push({ name: 'Option hébergement', value: data.hosting, inline: true })
  if (data.appointment) fields.push({ name: 'Visio 30 min', value: data.appointment, inline: true })

  return sendWebhook(
    process.env.DISCORD_WEBHOOK_NOTIFICATIONS,
    '',
    [
      {
        title: '🛒 Nouvelle commande',
        color: 0xd4af37, // gold
        fields,
        timestamp: new Date().toISOString(),
      },
    ]
  )
}

export async function notifyOrderStatusChanged(data: {
  orderId: string
  status?: string
  paid?: string
  firstVersionSent?: boolean
  chatEnabled?: boolean
}): Promise<boolean> {
  const changes: string[] = []
  if (data.status) changes.push(`Statut → **${data.status}**`)
  if (data.paid) changes.push(`Payé → **${data.paid}**`)
  if (data.firstVersionSent !== undefined) changes.push(`Première version → **${data.firstVersionSent ? 'Envoyée' : 'Non envoyée'}**`)
  if (data.chatEnabled !== undefined) changes.push(`Chat → **${data.chatEnabled ? 'Activé' : 'Désactivé'}**`)
  if (changes.length === 0) return true

  return sendWebhook(
    process.env.DISCORD_WEBHOOK_NOTIFICATIONS,
    '',
    [
      {
        title: '🔄 Statut de commande mis à jour',
        description: changes.join('\n'),
        color: 0x0ea5e9, // sky blue
        fields: [{ name: 'N° Commande', value: data.orderId, inline: true }],
        timestamp: new Date().toISOString(),
      },
    ]
  )
}

export async function notifyClientApproval(data: {
  orderId?: string
  clientName: string
  clientEmail: string
}): Promise<boolean> {
  return sendWebhook(
    process.env.DISCORD_WEBHOOK_NOTIFICATIONS,
    '',
    [
      {
        title: '✅ E-CV validé par le client',
        description: 'Le client a validé son E-CV — envoyer les instructions de paiement.',
        color: 0x16a34a,
        fields: [
          { name: 'Client', value: data.clientName, inline: true },
          { name: 'Email', value: data.clientEmail, inline: true },
          ...(data.orderId ? [{ name: 'Commande', value: data.orderId, inline: true }] : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ]
  )
}

export async function notifyAppointmentBooked(data: {
  orderId?: string
  firstName: string
  lastName: string
  email: string
  dateLabel: string
  timeLabel: string
  meetLink?: string
}): Promise<boolean> {
  const fields = [
    { name: 'Client', value: `${data.firstName} ${data.lastName}`, inline: true },
    { name: 'Email', value: data.email, inline: true },
    { name: 'Créneau', value: `${data.dateLabel}\n${data.timeLabel}`, inline: false },
  ]
  if (data.orderId) fields.push({ name: 'Commande', value: data.orderId, inline: true })
  if (data.meetLink) fields.push({ name: 'Google Meet', value: data.meetLink, inline: false })

  return sendWebhook(
    process.env.DISCORD_WEBHOOK_NOTIFICATIONS,
    '',
    [
      {
        title: '📅 Rendez-vous réservé',
        color: 0x22c55e, // green
        fields,
        timestamp: new Date().toISOString(),
      },
    ]
  )
}

export async function notifyPaymentReceived(data: {
  orderId: string
  firstName: string
  lastName: string
  email: string
  amount: string
  currency: string
}): Promise<boolean> {
  return sendWebhook(
    process.env.DISCORD_WEBHOOK_NOTIFICATIONS,
    '',
    [
      {
        title: '💰 Paiement reçu',
        color: 0x16a34a, // darker green
        fields: [
          { name: 'N° Commande', value: data.orderId, inline: true },
          { name: 'Client', value: `${data.firstName} ${data.lastName}`, inline: true },
          { name: 'Montant', value: `${data.amount} ${data.currency}`, inline: true },
          { name: 'Email', value: data.email, inline: false },
        ],
        timestamp: new Date().toISOString(),
      },
    ]
  )
}

export async function notifySkippedAppointment(data: {
  orderId?: string
  firstName: string
  lastName: string
  email: string
}): Promise<boolean> {
  return sendWebhook(
    process.env.DISCORD_WEBHOOK_NOTIFICATIONS,
    '',
    [
      {
        title: '⏭️ RDV reporté',
        description: 'Le client a choisi de réserver son créneau plus tard.',
        color: 0xf59e0b, // amber
        fields: [
          { name: 'Client', value: `${data.firstName} ${data.lastName}`, inline: true },
          { name: 'Email', value: data.email, inline: true },
          ...(data.orderId ? [{ name: 'Commande', value: data.orderId, inline: true }] : []),
        ],
        timestamp: new Date().toISOString(),
      },
    ]
  )
}

// ── Questionnaire channel ─────────────────────────

export async function notifyNewQuestionnaire(data: {
  orderId: string
  firstName: string
  lastName: string
  email: string
  profession: string
  colorPalette: string
  siteStyle: string
}): Promise<boolean> {
  return sendWebhook(
    process.env.DISCORD_WEBHOOK_QUESTIONNAIRES,
    '',
    [
      {
        title: '📋 Nouveau questionnaire',
        color: 0x6366f1, // indigo
        fields: [
          { name: 'N° Commande', value: data.orderId, inline: true },
          { name: 'Client', value: `${data.firstName} ${data.lastName}`, inline: true },
          { name: 'Email', value: data.email, inline: false },
          { name: 'Profession', value: data.profession || '—', inline: true },
          { name: 'Palette', value: data.colorPalette || '—', inline: true },
          { name: 'Style', value: data.siteStyle || '—', inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    ]
  )
}

// ── Chat channel ──────────────────────────────────

export async function notifyChatMessage(data: {
  clientName: string
  clientEmail: string
  message: string
  orderId?: string
}): Promise<boolean> {
  return sendWebhook(
    process.env.DISCORD_WEBHOOK_CHAT,
    '',
    [
      {
        title: `💬 Message de ${data.clientName}`,
        description: data.message.slice(0, 2000),
        color: 0x3b82f6, // blue
        fields: [
          { name: 'Email', value: data.clientEmail, inline: true },
          ...(data.orderId ? [{ name: 'Commande', value: data.orderId, inline: true }] : []),
        ],
        timestamp: new Date().toISOString(),
        footer: { text: 'Répondre depuis Discord n\'est pas encore supporté — voir espace admin' },
      },
    ]
  )
}

// ── Client account creation ───────────────────────

export async function notifyClientAccountCreated(data: {
  orderId: string
  firstName: string
  lastName: string
  email: string
}): Promise<boolean> {
  return sendWebhook(
    process.env.DISCORD_WEBHOOK_NOTIFICATIONS,
    '',
    [
      {
        title: '👤 Compte client créé',
        color: 0x8b5cf6, // purple
        fields: [
          { name: 'N° Commande', value: data.orderId, inline: true },
          { name: 'Client', value: `${data.firstName} ${data.lastName}`, inline: true },
          { name: 'Email', value: data.email, inline: false },
        ],
        timestamp: new Date().toISOString(),
      },
    ]
  )
}
