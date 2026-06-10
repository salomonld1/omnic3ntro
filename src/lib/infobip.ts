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

  // user → parent (client) → grandparent (reseller) → env
  if (user?.infobipApiKey && user?.infobipBaseUrl)
    return { apiKey: user.infobipApiKey, baseUrl: user.infobipBaseUrl }
  if (user?.parent?.infobipApiKey && user?.parent?.infobipBaseUrl)
    return { apiKey: user.parent.infobipApiKey, baseUrl: user.parent.infobipBaseUrl }
  if (user?.parent?.parent?.infobipApiKey && user?.parent?.parent?.infobipBaseUrl)
    return { apiKey: user.parent.parent.infobipApiKey, baseUrl: user.parent.parent.infobipBaseUrl }
  return {
    apiKey: process.env.INFOBIP_API_KEY || '',
    baseUrl: process.env.INFOBIP_BASE_URL || '',
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
  params: { from?: string; to: string | string[]; text: string; notifyUrl?: string; scheduleTime?: string }
) {
  const creds = await resolveCredentials(userId)
  const destinations = Array.isArray(params.to)
    ? params.to.map((phone) => ({ to: phone }))
    : [{ to: params.to }]

  return infobipRequest('/sms/3/messages', 'POST', {
    messages: [{
      from: params.from || 'Omnic3ntro',
      destinations,
      text: params.text,
      notifyUrl: params.notifyUrl,
      sendAt: params.scheduleTime,
    }],
  }, creds)
}

export async function sendWhatsApp(
  userId: string,
  params: { from: string; to: string; content: { text?: string; templateName?: string; language?: string } }
) {
  const creds = await resolveCredentials(userId)

  if (params.content.templateName) {
    return infobipRequest('/whatsapp/1/message/template', 'POST', {
      messages: [{
        from: params.from,
        to: params.to,
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
    content: { text: params.content.text },
  }, creds)
}

export async function sendRcs(
  userId: string,
  params: { from: string; to: string; content: { text: string } }
) {
  const creds = await resolveCredentials(userId)
  return infobipRequest('/rcs/1/message', 'POST', {
    from: params.from,
    to: params.to,
    content: { text: params.content.text },
  }, creds)
}

export async function getDeliveryReports(userId: string, bulkId?: string) {
  const creds = await resolveCredentials(userId)
  const query = bulkId ? `?bulkId=${bulkId}` : ''
  return infobipRequest(`/sms/3/reports${query}`, 'GET', undefined, creds)
}

export async function getSmsLogs(
  userId: string,
  params?: { from?: string; to?: string; limit?: number }
) {
  const creds = await resolveCredentials(userId)
  const query = new URLSearchParams()
  if (params?.from) query.set('from', params.from)
  if (params?.to) query.set('to', params.to)
  if (params?.limit) query.set('limit', String(params.limit))
  return infobipRequest(`/sms/3/logs?${query}`, 'GET', undefined, creds)
}
