import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sendWhatsApp, resolveAppId } from '@/lib/infobip'
import { checkBilling, recordDebit } from '@/lib/billing'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/phone'

const VALID_CATEGORIES = ['marketing', 'otp', 'notificacion']

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { from, message, type, category } = body
  const to = normalizePhone(body.to ?? '')

  if (!to || !from || !message) {
    return NextResponse.json({ error: 'to, from y message son requeridos' }, { status: 400 })
  }
  if (category && !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: `Categoría inválida. Valores permitidos: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 })
  }
  const resolvedCategory = category ?? 'marketing'

  const billing = await checkBilling(session.userId, 'whatsapp', resolvedCategory)
  if (!billing.canSend) return NextResponse.json({ error: billing.error }, { status: 402 })

  const msg = await prisma.message.create({
    data: { to, from, content: message, channel: 'whatsapp', category: resolvedCategory, status: 'pending', userId: session.userId },
  })

  try {
    const appId = await resolveAppId(session.userId)
    const content = type === 'template'
      ? { templateName: message, language: 'es' }
      : { text: message }
    const result = await sendWhatsApp(session.userId, { from, to, content, appId })
    const messageId = (result as { messages?: Array<{ messageId?: string }> })?.messages?.[0]?.messageId

    await prisma.message.update({
      where: { id: msg.id },
      data: { status: 'sent', messageId: messageId ?? null, sentAt: new Date() },
    })
    await recordDebit(session.userId, 1, 'whatsapp', resolvedCategory)

    const warning = 'warning' in billing ? billing.warning : undefined
    return NextResponse.json({ success: true, messageId, warning })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
