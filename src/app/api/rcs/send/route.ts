import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { sendRcs, resolveAppId } from '@/lib/infobip'
import { checkBilling, recordDebit } from '@/lib/billing'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const billing = await checkBilling(session.userId)
  if (!billing.canSend) return NextResponse.json({ error: billing.error }, { status: 402 })

  const { to, from, message } = await req.json()
  if (!to || !from || !message) {
    return NextResponse.json({ error: 'to, from y message son requeridos' }, { status: 400 })
  }

  try {
    const appId = await resolveAppId(session.userId)
    const result = await sendRcs(session.userId, { from, to, content: { text: message }, appId })
    const messageId = (result as { messageId?: string })?.messageId
    await Promise.all([
      recordDebit(session.userId, 1),
      prisma.message.create({
        data: { to, from, content: message, channel: 'rcs', status: 'pending', messageId: messageId ?? null, userId: session.userId, sentAt: new Date() },
      }),
    ])
    const warning = 'warning' in billing ? billing.warning : undefined
    return NextResponse.json({ success: true, messageId, warning })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
