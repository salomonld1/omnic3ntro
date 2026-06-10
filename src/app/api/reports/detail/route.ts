import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchSmsLogs, fetchWhatsAppLogs } from '@/lib/infobip'
import type { InfobipSmsLog, InfobipWhatsAppLog } from '@/lib/infobip'

function periodDates(period: string, from?: string, to?: string) {
  const now = new Date()
  if (period === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    return { sentSince: start.toISOString(), sentUntil: now.toISOString() }
  }
  if (period === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 7); start.setHours(0, 0, 0, 0)
    return { sentSince: start.toISOString(), sentUntil: now.toISOString() }
  }
  if (period === 'month') {
    const start = new Date(now); start.setDate(1); start.setHours(0, 0, 0, 0)
    return { sentSince: start.toISOString(), sentUntil: now.toISOString() }
  }
  if (period === 'custom' && from && to) {
    return {
      sentSince: new Date(from).toISOString(),
      sentUntil: new Date(to + 'T23:59:59').toISOString(),
    }
  }
  return {}
}

type NormalizedMessage = {
  messageId: string
  to: string
  from: string
  text: string
  channel: 'sms' | 'whatsapp'
  sentAt: string
  status: string
  pricePerMessage: number | null
  currency: string | null
  clientReference: string | null
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const period     = searchParams.get('period') ?? 'month'
  const from       = searchParams.get('from') ?? undefined
  const to         = searchParams.get('to') ?? undefined
  const channel    = searchParams.get('channel') ?? undefined
  const userId     = searchParams.get('userId') ?? undefined
  const page       = parseInt(searchParams.get('page') ?? '1')
  const limit      = 50

  // Determine which userIds this session can see
  let allowedUserIds: Set<string> | null = null // null = see all (admin)

  if (session.role !== 'admin') {
    let ids: string[] = []
    if (session.role === 'reseller') {
      const clients = await prisma.user.findMany({
        where: { parentId: session.userId },
        select: { id: true },
      })
      const clientIds = clients.map((c) => c.id)
      const childUsers = await prisma.user.findMany({
        where: { parentId: { in: clientIds } },
        select: { id: true },
      })
      ids = [...clientIds, ...childUsers.map((u) => u.id)]
    } else if (session.role === 'client') {
      const childUsers = await prisma.user.findMany({
        where: { parentId: session.userId },
        select: { id: true },
      })
      ids = [session.userId, ...childUsers.map((u) => u.id)]
    } else {
      ids = [session.userId]
    }
    allowedUserIds = new Set(userId ? [userId] : ids)
  } else if (userId) {
    allowedUserIds = new Set([userId])
  }

  const dates = periodDates(period, from, to)

  // Fetch from Infobip in parallel
  const [smsLogs, waLogs] = await Promise.all([
    channel === 'whatsapp' ? [] : fetchSmsLogs({ ...dates, limit: 1000 }),
    channel === 'sms'      ? [] : fetchWhatsAppLogs({ ...dates, limit: 1000 }),
  ])

  // Normalize to unified format
  const messages: NormalizedMessage[] = [
    ...smsLogs.map((m: InfobipSmsLog): NormalizedMessage => ({
      messageId: m.messageId,
      to: m.to,
      from: m.from,
      text: m.text ?? '',
      channel: 'sms',
      sentAt: m.sentAt,
      status: m.status?.groupName?.toLowerCase() ?? 'unknown',
      pricePerMessage: m.price?.pricePerMessage ?? null,
      currency: m.price?.currency ?? null,
      clientReference: m.clientReference ?? null,
    })),
    ...waLogs.map((m: InfobipWhatsAppLog): NormalizedMessage => ({
      messageId: m.messageId,
      to: m.to,
      from: m.from,
      text: m.content?.text ?? m.content?.templateName ?? '',
      channel: 'whatsapp',
      sentAt: m.sentAt,
      status: m.status?.groupName?.toLowerCase() ?? 'unknown',
      pricePerMessage: m.price?.pricePerMessage ?? null,
      currency: m.price?.currency ?? null,
      clientReference: m.callbackData ?? null,
    })),
  ]

  // Filter by allowed users
  const filtered = messages.filter((m) => {
    if (!allowedUserIds) return true
    return m.clientReference ? allowedUserIds.has(m.clientReference) : false
  })

  // Sort by sentAt desc
  filtered.sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))

  const total = filtered.length
  const paginated = filtered.slice((page - 1) * limit, page * limit)

  // Enrich with user info from DB
  const refIds = [...new Set(paginated.map((m) => m.clientReference).filter(Boolean))] as string[]
  const users = refIds.length
    ? await prisma.user.findMany({
        where: { id: { in: refIds } },
        select: { id: true, name: true, pricePerMessage: true, parent: { select: { pricePerMessage: true } } },
      })
    : []
  const userMap = new Map(users.map((u) => [u.id, u]))

  const result = paginated.map((m) => {
    const u = m.clientReference ? userMap.get(m.clientReference) : null
    const isAdminViewingResellerClient = session.role === 'admin' && u?.parent != null
    const price = m.pricePerMessage ??
      (isAdminViewingResellerClient ? u?.parent?.pricePerMessage : u?.pricePerMessage) ?? null
    return { ...m, userName: u?.name ?? m.clientReference ?? 'Desconocido', cost: price }
  })

  const fmt = searchParams.get('format')
  if (fmt === 'csv') {
    const headers = ['Fecha', 'Destinatario', 'Canal', 'Estado', 'Usuario', 'Costo', 'Mensaje']
    const lines = [
      headers.join(','),
      ...result.map((m) => [
        m.sentAt,
        m.to,
        m.channel,
        m.status,
        `"${m.userName}"`,
        m.cost?.toFixed(4) ?? '',
        `"${m.text.replace(/"/g, "'")}"`,
      ].join(',')),
    ]
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="reporte-detalle.csv"',
      },
    })
  }

  return NextResponse.json({ messages: result, total, pages: Math.ceil(total / limit), page })
}
