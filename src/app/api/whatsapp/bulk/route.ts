import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { resolveCredentials } from '@/lib/infobip'
import { checkBilling, recordDebit } from '@/lib/billing'

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

  const recipients: ContactPayload[] =
    contacts.length > 0
      ? contacts
      : numbers.map((to) => ({ to, message }))

  try {
    const { apiKey, baseUrl } = await resolveCredentials(session.userId)
    if (!apiKey || !baseUrl) {
      return NextResponse.json({ error: 'Credenciales Infobip no configuradas' }, { status: 503 })
    }

    await Promise.allSettled(
      recipients.map((c) =>
        fetch(`https://${baseUrl}/whatsapp/1/message/text`, {
          method: 'POST',
          headers: { Authorization: `App ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: from || undefined,
            to: c.to,
            callbackData: session.userId,
            content: { text: c.message || message },
          }),
        })
      )
    )

    await recordDebit(session.userId, recipients.length)
    const warning = 'warning' in billing ? billing.warning : undefined
    return NextResponse.json({ success: true, total: recipients.length, warning })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
