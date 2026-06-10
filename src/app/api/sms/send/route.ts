import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendSms } from '@/lib/infobip'
import { checkBilling, recordDebit } from '@/lib/billing'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const billing = await checkBilling(session.userId)
  if (!billing.canSend) return NextResponse.json({ error: billing.error }, { status: 402 })

  const { to, from, message } = await req.json()
  if (!to || !message) return NextResponse.json({ error: 'to y message son requeridos' }, { status: 400 })

  const msg = await prisma.message.create({
    data: {
      to,
      from: from || null,
      content: message,
      channel: 'sms',
      status: 'pending',
      userId: session.userId,
    },
  })

  try {
    const result = await sendSms(session.userId, { to, from, text: message })
    const messageId = (result as { messages?: Array<{ messageId?: string }> })?.messages?.[0]?.messageId
    await prisma.message.update({
      where: { id: msg.id },
      data: { status: 'sent', messageId: messageId ?? null, sentAt: new Date() },
    })
    await recordDebit(session.userId, 1)
    const warning = 'warning' in billing ? billing.warning : undefined
    return NextResponse.json({ success: true, messageId: messageId ?? msg.id, warning })
  } catch (err) {
    await prisma.message.update({ where: { id: msg.id }, data: { status: 'failed' } })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
