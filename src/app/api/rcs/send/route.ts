import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendRcs } from '@/lib/infobip'
import { checkBilling, recordDebit } from '@/lib/billing'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const billing = await checkBilling(session.userId)
  if (!billing.canSend) return NextResponse.json({ error: billing.error }, { status: 402 })

  const { to, from, message } = await req.json()
  if (!to || !from || !message) {
    return NextResponse.json({ error: 'to, from y message son requeridos' }, { status: 400 })
  }

  const msg = await prisma.message.create({
    data: { to, from, content: message, channel: 'rcs', status: 'pending', userId: session.userId },
  })

  try {
    const result = await sendRcs(session.userId, { from, to, content: { text: message } })
    const messageId = (result as { messageId?: string })?.messageId
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
