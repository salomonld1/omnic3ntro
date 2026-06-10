import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveCredentials, resolveAppId } from '@/lib/infobip'
import { checkBilling, recordDebit } from '@/lib/billing'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/phone'

type ContactPayload = { to: string; message?: string; name?: string }

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const billing = await checkBilling(session.userId)
  if (!billing.canSend) return NextResponse.json({ error: billing.error }, { status: 402 })

  const body = await req.json()
  const { name, from, message } = body
  const contacts: ContactPayload[] = body.contacts ?? []
  const numbers: string[] = body.numbers ?? []

  if (!name || !message) {
    return NextResponse.json({ error: 'name y message son requeridos' }, { status: 400 })
  }
  if (contacts.length === 0 && numbers.length === 0) {
    return NextResponse.json({ error: 'Se requiere al menos un destinatario' }, { status: 400 })
  }

  const recipients: ContactPayload[] = (
    contacts.length > 0 ? contacts : numbers.map((to) => ({ to, message }))
  ).map((c) => ({ ...c, to: normalizePhone(c.to) }))

  try {
    const { apiKey, baseUrl } = await resolveCredentials(session.userId)
    if (!apiKey || !baseUrl) {
      return NextResponse.json({ error: 'Credenciales Infobip no configuradas' }, { status: 503 })
    }

    const appId = await resolveAppId(session.userId)
    const platform = appId ? { applicationId: appId } : undefined

    const hasPersonalized = recipients.some((c) => c.message && c.message !== message)
    let bulkId: string | undefined

    if (hasPersonalized) {
      await Promise.allSettled(
        recipients.map((c) =>
          fetch(`https://${baseUrl}/sms/3/messages`, {
            method: 'POST',
            headers: { Authorization: `App ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{
                sender: from || 'Omnic3ntro',
                destinations: [{ to: c.to }],
                content: { text: c.message || message },
                ...(platform ? { platform } : {}),
              }],
            }),
          })
        )
      )
    } else {
      const res = await fetch(`https://${baseUrl}/sms/3/messages`, {
        method: 'POST',
        headers: { Authorization: `App ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            sender: from || 'Omnic3ntro',
            destinations: recipients.map((c) => ({ to: c.to })),
            content: { text: message },
            ...(platform ? { platform } : {}),
          }],
        }),
      })
      const data = await res.json()
      bulkId = data.bulkId
    }

    const now = new Date()
    await Promise.all([
      recordDebit(session.userId, recipients.length),
      prisma.message.createMany({
        data: recipients.map((c) => ({
          to: c.to, from: from ?? null, content: c.message ?? message,
          channel: 'sms', status: 'pending', bulkId: bulkId ?? null,
          userId: session.userId, sentAt: now,
        })),
      }),
    ])
    const warning = 'warning' in billing ? billing.warning : undefined
    return NextResponse.json({ success: true, bulkId, total: recipients.length, warning })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
