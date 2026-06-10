import { prisma } from './prisma'

export async function resolveCredentials(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      infobipApiKey: true,
      infobipBaseUrl: true,
      parent: {
        select: {
          infobipApiKey: true,
          infobipBaseUrl: true,
          parent: { select: { infobipApiKey: true, infobipBaseUrl: true } },
        },
      },
    },
  })

  if (user?.infobipApiKey && user?.infobipBaseUrl)
    return { apiKey: user.infobipApiKey, baseUrl: user.infobipBaseUrl }
  if (user?.parent?.infobipApiKey && user?.parent?.infobipBaseUrl)
    return { apiKey: user.parent.infobipApiKey, baseUrl: user.parent.infobipBaseUrl }
  if (user?.parent?.parent?.infobipApiKey && user?.parent?.parent?.infobipBaseUrl)
    return { apiKey: user.parent.parent.infobipApiKey, baseUrl: user.parent.parent.infobipBaseUrl }
  return getGlobalCredentials()
}

export function getGlobalCredentials() {
  return {
    apiKey: process.env.INFOBIP_API_KEY ?? '',
    baseUrl: process.env.INFOBIP_BASE_URL ?? '',
  }
}

async function infobipRequest(
  path: string,
  method: string,
  body: unknown,
  creds: { apiKey: string; baseUrl: string }
) {
  if (!creds.apiKey || !creds.baseUrl) {
    return { mock: true, message: 'Infobip credentials not configured' }
  }

  const response = await fetch(`https://${creds.baseUrl}${path}`, {
    method,
    headers: {
      'Authorization': `App ${creds.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Infobip error ${response.status}: ${error}`)
  }

  return response.json()
}

export async function sendSms(
  userId: string,
  params: {
    from?: string
    to: string | string[]
    text: string
    notifyUrl?: string
    scheduleTime?: string
    clientReference?: string
  }
) {
  const creds = await resolveCredentials(userId)
  const destinations = Array.isArray(params.to)
    ? params.to.map((phone) => ({ to: phone }))
    : [{ to: params.to }]

  return infobipRequest('/sms/3/messages', 'POST', {
    messages: [{
      sender: params.from || 'Omnic3ntro',
      destinations,
      content: { text: params.text },
      notifyUrl: params.notifyUrl,
      sendAt: params.scheduleTime,
      clientReference: params.clientReference,
    }],
  }, creds)
}

export async function sendWhatsApp(
  userId: string,
  params: {
    from: string
    to: string
    content: { text?: string; templateName?: string; language?: string }
    callbackData?: string
  }
) {
  const creds = await resolveCredentials(userId)

  if (params.content.templateName) {
    return infobipRequest('/whatsapp/1/message/template', 'POST', {
      messages: [{
        from: params.from,
        to: params.to,
        callbackData: params.callbackData,
        content: {
          templateName: params.content.templateName,
          templateData: { body: { placeholders: [] } },
          language: params.content.language || 'es',
        },
      }],
    }, creds)
  }

  return infobipRequest('/whatsapp/1/message/text', 'POST', {
    from: params.from,
    to: params.to,
    callbackData: params.callbackData,
    content: { text: params.content.text },
  }, creds)
}

export async function sendRcs(
  userId: string,
  params: { from: string; to: string; content: { text: string }; callbackData?: string }
) {
  const creds = await resolveCredentials(userId)
  return infobipRequest('/rcs/1/message', 'POST', {
    from: params.from,
    to: params.to,
    callbackData: params.callbackData,
    content: { text: params.content.text },
  }, creds)
}

// ─── Log types (field names as returned by this Infobip instance) ─────────────

export type InfobipSmsLog = {
  messageId: string
  destination: string   // phone number
  sender: string
  bulkId?: string
  sentAt: string
  doneAt?: string
  messageCount: number
  price?: { pricePerMessage: number; currency: string }
  status: { groupId: number; groupName: string; id: number; name: string; description: string }
  error?: { groupId: number; groupName: string; id: number; name: string }
  content?: { text?: string }
  clientReference?: string
}

export type InfobipWhatsAppLog = {
  messageId: string
  destination?: string
  to?: string
  from?: string
  sender?: string
  sentAt: string
  doneAt?: string
  price?: { pricePerMessage: number; currency: string }
  status: { groupId: number; groupName: string; id: number; name: string; description: string }
  error?: { groupId: number; groupName: string; id: number; name: string }
  callbackData?: string
  content?: { text?: string; templateName?: string }
}

// ─── Unified log type for reports ─────────────────────────────────────────────

export type UnifiedLog = {
  messageId: string
  to: string
  from: string
  text: string
  channel: 'sms' | 'whatsapp'
  sentAt: string
  statusGroup: string   // DELIVERED | UNDELIVERABLE | PENDING | REJECTED | EXPIRED
  pricePerMessage: number | null
  currency: string | null
}

// ─── Log fetchers (always use global/env credentials) ─────────────────────────

export async function fetchSmsLogs(params: {
  sentSince?: string
  sentUntil?: string
  limit?: number
}): Promise<UnifiedLog[]> {
  const { apiKey, baseUrl } = getGlobalCredentials()
  if (!apiKey || !baseUrl) return []

  const q = new URLSearchParams()
  if (params.sentSince) q.set('sentSince', params.sentSince)
  if (params.sentUntil) q.set('sentUntil', params.sentUntil)
  q.set('limit', String(Math.min(params.limit ?? 1000, 1000)))

  try {
    const res = await fetch(`https://${baseUrl}/sms/3/logs?${q}`, {
      headers: { Authorization: `App ${apiKey}`, Accept: 'application/json' },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).map((m: InfobipSmsLog): UnifiedLog => ({
      messageId: m.messageId,
      to: m.destination ?? '',
      from: m.sender ?? '',
      text: m.content?.text ?? '',
      channel: 'sms',
      sentAt: m.sentAt,
      statusGroup: m.status?.groupName ?? 'UNKNOWN',
      pricePerMessage: m.price?.pricePerMessage ?? null,
      currency: m.price?.currency ?? null,
    }))
  } catch {
    return []
  }
}

export async function fetchWhatsAppLogs(params: {
  sentSince?: string
  sentUntil?: string
  limit?: number
}): Promise<UnifiedLog[]> {
  const { apiKey, baseUrl } = getGlobalCredentials()
  if (!apiKey || !baseUrl) return []

  const q = new URLSearchParams()
  if (params.sentSince) q.set('sentSince', params.sentSince)
  if (params.sentUntil) q.set('sentUntil', params.sentUntil)
  q.set('limit', String(Math.min(params.limit ?? 1000, 1000)))

  try {
    const res = await fetch(`https://${baseUrl}/whatsapp/1/logs?${q}`, {
      headers: { Authorization: `App ${apiKey}`, Accept: 'application/json' },
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []).map((m: InfobipWhatsAppLog): UnifiedLog => ({
      messageId: m.messageId,
      to: m.destination ?? m.to ?? '',
      from: m.sender ?? m.from ?? '',
      text: m.content?.text ?? m.content?.templateName ?? '',
      channel: 'whatsapp',
      sentAt: m.sentAt,
      statusGroup: m.status?.groupName ?? 'UNKNOWN',
      pricePerMessage: m.price?.pricePerMessage ?? null,
      currency: m.price?.currency ?? null,
    }))
  } catch {
    return []
  }
}
