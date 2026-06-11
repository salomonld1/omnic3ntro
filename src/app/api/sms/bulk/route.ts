import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveCredentials } from '@/lib/infobip'
import { checkBilling, recordDebit } from '@/lib/billing'

type ContactPayload = { to: string; message?: string; name?: string }

const VALID_CATEGORIES = ['marketing', 'transaccional']

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { name, from, message, category } = body
  const contacts: ContactPayload[] = body.contacts ?? []
  const numbers: string[] = body.numbers ?? []

  if (!name || !message) {
    return NextResponse.json({ error: 'name y message son requeridos' }, { status: 400 })
  }
  if (contacts.length === 0 && numbers.length === 0) {
    return NextResponse.json({ error: 'Se requiere al menos un destinatario' }, { status: 400 })
  }
  if (category && !VALID_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: `Categoría inválida. Valores permitidos: ${VALID_CATEGORIES.join(', ')}` }, { status: 400 })
  }
  const resolvedCategory = category ?? 'transaccional'

  const billing = await checkBilling(session.userId, 'sms', resolvedCategory)
  if (!billing.canSend) return NextResponse.json({ error: billing.error }, { status: 402 })

  const recipients: ContactPayload[] =
    contacts.length > 0
      ? contacts
      : numbers.map((to) => ({ to, message }))

  const campaign = await prisma.campaign.create({
    data: {
      name,
      channel: 'sms',
      status: 'sending',
      total: recipients.length,
      userId: session.userId,
    },
  })

  await prisma.message.createMany({
    data: recipients.map((c) => ({
      to: c.to,
      from: from || null,
      content: c.message || message,
      channel: 'sms',
      category: resolvedCategory,
      status: 'pending',
      campaignId: campaign.id,
      userId: session.userId,
    })),
  })

  try {
    const { apiKey, baseUrl } = await resolveCredentials(session.userId)

    // Send individually when messages are personalized, bulk otherwise
    const hasPersonalized = recipients.some((c) => c.message && c.message !== message)

    let bulkId: string | undefined
    if (hasPersonalized) {
      await Promise.allSettled(
        recipients.map((c) =>
          fetch(`${baseUrl}/sms/2/text/advanced`, {
            method: 'POST',
            headers: { Authorization: `App ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ from: from || undefined, destinations: [{ to: c.to }], text: c.message || message }],
            }),
          })
        )
      )
    } else {
      const res = await fetch(`${baseUrl}/sms/2/text/advanced`, {
        method: 'POST',
        headers: { Authorization: `App ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            from: from || undefined,
            destinations: recipients.map((c) => ({ to: c.to })),
            text: message,
          }],
        }),
      })
      const data = await res.json()
      bulkId = data.bulkId
    }

    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: 'sent', sent: recipients.length },
    })
    if (bulkId) {
      await prisma.message.updateMany({
        where: { campaignId: campaign.id },
        data: { status: 'sent', bulkId, sentAt: new Date() },
      })
    } else {
      await prisma.message.updateMany({
        where: { campaignId: campaign.id },
        data: { status: 'sent', sentAt: new Date() },
      })
    }

    await recordDebit(session.userId, recipients.length, 'sms', resolvedCategory)
    const warning = 'warning' in billing ? billing.warning : undefined
    return NextResponse.json({ success: true, campaignId: campaign.id, total: recipients.length, warning })
  } catch (err) {
    await prisma.campaign.update({ where: { id: campaign.id }, data: { status: 'failed' } })
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
