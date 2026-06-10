import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sendWhatsApp, resolveAppId } from '@/lib/infobip'
import { checkBilling, recordDebit } from '@/lib/billing'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/phone'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const billing = await checkBilling(session.userId)
  if (!billing.canSend) return NextResponse.json({ error: billing.error }, { status: 402 })

  const body = await req.json()
  const { from, message, type } = body
  const to = normalizePhone(body.to ?? '')
  if (!to || !from || !message) {
    return NextResponse.json({ error: 'to, from y message son requeridos' }, { status: 400 })
  }

  try {
    const appId = await resolveAppId(session.userId)
    const content = type === 'template'
      ? { templateName: message, language: 'es' }
      : { text: message }
    const result = await sendWhatsApp(session.userId, { from, to, content, appId })
    const messageId = (result as { messages?: Array<{ messageId?: string }> })?.messages?.[0]?.messageId
    await Promise.all([
      recordDebit(session.userId, 1),
      prisma.message.create({
        data: { to, from, content: message, channel: 'whatsapp', status: 'pending', messageId: messageId ?? null, userId: session.userId, sentAt: new Date() },
      }),
    ])
    const warning = 'warning' in billing ? billing.warning : undefined
    return NextResponse.json({ success: true, messageId, warning })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
