import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp } from '@/lib/infobip'
import { checkBilling, recordDebit } from '@/lib/billing'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const billing = await checkBilling(session.userId)
  if (!billing.canSend) return NextResponse.json({ error: billing.error }, { status: 402 })

  const { to, from, message, type, category } = await req.json()
  if (!to || !from || !message) {
    return NextResponse.json({ error: 'to, from y message son requeridos' }, { status: 400 })
  }

  const msg = await prisma.message.create({
    data: { to, from, content: message, channel: 'whatsapp', category: category ?? 'marketing', status: 'pending', userId: session.userId },
  })

  try {
    const content = type === 'template'
      ? { templateName: message, language: 'es' }
      : { text: message }
    const result = await sendWhatsApp(session.userId, { from, to, content })
    const messageId = (result as { messages?: Array<{ messageId?: string }> })?.messages?.[0]?.messageId
    await prisma.message.update({
      where: { id: msg.id },
      data: { status: 'sent', messageId: messageId ?? null, sentAt: new Date() },
    })
    await recordDebit(session.userId, 1, 'whatsapp', category ?? 'marketing')
    const warning = 'warning' in billing ? billing.warning : undefined
    return NextResponse.json({ success: true, messageId: messageId ?? msg.id, warning })
  } catch (err) {
    await prisma.message.update({ where: { id: msg.id }, data: { status: 'failed' } })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
