import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sendSms, resolveAppId } from '@/lib/infobip'
import { checkBilling, recordDebit } from '@/lib/billing'
import { prisma } from '@/lib/prisma'
import { normalizePhone } from '@/lib/phone'

const VALID_CATEGORIES = ['marketing', 'transaccional']

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { from, message, category } = body
    const to = normalizePhone(body.to)
    if (!to || !message) return NextResponse.json({ error: 'to y message son requeridos' }, { status: 400 })
    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ error: `Categoría inválida. Valores permitidos: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 })
    }
    const resolvedCategory = category ?? 'transaccional'

    const billing = await checkBilling(session.userId, 'sms', resolvedCategory)
    if (!billing.canSend) return NextResponse.json({ error: billing.error }, { status: 402 })

    const msg = await prisma.message.create({
      data: {
        to,
        from: from || null,
        content: message,
        channel: 'sms',
        category: resolvedCategory,
        status: 'pending',
        userId: session.userId,
      },
    })

    const appId = await resolveAppId(session.userId)
    const result = await sendSms(session.userId, { to, from, text: message, appId })
    const messageId = (result as { messages?: Array<{ messageId?: string }> })?.messages?.[0]?.messageId

    await prisma.message.update({
      where: { id: msg.id },
      data: { status: 'sent', messageId: messageId ?? null, sentAt: new Date() },
    })
    await recordDebit(session.userId, 1, 'sms', resolvedCategory)

    const warning = 'warning' in billing ? billing.warning : undefined
    return NextResponse.json({ success: true, messageId, warning })
  } catch (err) {
    console.error('[sms/send]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
