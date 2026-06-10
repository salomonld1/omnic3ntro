import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sendSms, resolveAppId } from '@/lib/infobip'
import { checkBilling, recordDebit } from '@/lib/billing'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/phone'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const billing = await checkBilling(session.userId)
    if (!billing.canSend) return NextResponse.json({ error: billing.error }, { status: 402 })

    const body = await req.json()
    const { from, message } = body
    const to = normalizePhone(body.to)
    if (!to || !message) return NextResponse.json({ error: 'to y message son requeridos' }, { status: 400 })

    const appId = await resolveAppId(session.userId)
    const result = await sendSms(session.userId, { to, from, text: message, appId })
    const messageId = (result as { messages?: Array<{ messageId?: string }> })?.messages?.[0]?.messageId

    await Promise.all([
      recordDebit(session.userId, 1),
      prisma.message.create({
        data: { to, from: from ?? null, content: message, channel: 'sms', status: 'pending', messageId: messageId ?? null, userId: session.userId, sentAt: new Date() },
      }),
    ])

    const warning = 'warning' in billing ? billing.warning : undefined
    return NextResponse.json({ success: true, messageId, warning })
  } catch (err) {
    console.error('[sms/send]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
