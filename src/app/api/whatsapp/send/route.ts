import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp } from '@/lib/infobip'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { to, from, message, type } = await req.json()
  if (!to || !from || !message) {
    return NextResponse.json({ error: 'to, from y message son requeridos' }, { status: 400 })
  }

  const msg = await prisma.message.create({
    data: { to, from, content: message, channel: 'whatsapp', status: 'pending', userId: session.userId },
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
    return NextResponse.json({ success: true, messageId: messageId ?? msg.id })
  } catch (err) {
    await prisma.message.update({ where: { id: msg.id }, data: { status: 'failed' } })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
