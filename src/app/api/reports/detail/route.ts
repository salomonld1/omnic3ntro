import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

function dateRange(period: string, from?: string, to?: string) {
  const now = new Date()
  if (period === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    return { gte: start }
  }
  if (period === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 7); start.setHours(0, 0, 0, 0)
    return { gte: start }
  }
  if (period === 'month') {
    const start = new Date(now); start.setDate(1); start.setHours(0, 0, 0, 0)
    return { gte: start }
  }
  if (period === 'custom' && from && to) {
    return { gte: new Date(from), lte: new Date(to + 'T23:59:59') }
  }
  return undefined
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const period     = searchParams.get('period') ?? 'month'
  const from       = searchParams.get('from') ?? undefined
  const to         = searchParams.get('to') ?? undefined
  const channel    = searchParams.get('channel') ?? undefined
  const resellerId = searchParams.get('resellerId') ?? undefined
  const userId     = searchParams.get('userId') ?? undefined
  const page       = parseInt(searchParams.get('page') ?? '1')
  const limit      = 50

  // Build allowed user IDs
  let userIds: string[] = []
  if (session.role === 'admin') {
    const where: Record<string, unknown> = { role: { not: 'admin' } }
    if (resellerId) where.parentId = resellerId
    if (userId) where.id = userId
    const users = await prisma.user.findMany({ where, select: { id: true } })
    userIds = users.map((u) => u.id)
  } else if (session.role === 'reseller') {
    const where: Record<string, unknown> = { parentId: session.userId }
    if (userId) where.id = userId
    const users = await prisma.user.findMany({ where, select: { id: true } })
    userIds = users.map((u) => u.id)
  } else {
    userIds = [session.userId]
  }

  if (userIds.length === 0) return NextResponse.json({ messages: [], total: 0, pages: 0 })

  const createdAt = dateRange(period, from, to)
  const where = {
    userId: { in: userIds },
    ...(channel ? { channel } : {}),
    ...(createdAt ? { createdAt } : {}),
  }

  const [total, messages] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        to: true,
        content: true,
        channel: true,
        status: true,
        cost: true,
        createdAt: true,
        sentAt: true,
        user: { select: { id: true, name: true, pricePerMessage: true, parent: { select: { pricePerMessage: true } } } },
        campaign: { select: { name: true } },
      },
    }),
  ])

  // Determine effective price per message respecting the two-layer pricing model
  function effectivePrice(m: typeof messages[0]) {
    if (m.cost != null) return m.cost
    // Admin sees reseller's price for reseller-owned clients; reseller sees their client's price
    const isAdminViewingResellerClient = session.role === 'admin' && m.user.parent != null
    const price = isAdminViewingResellerClient
      ? m.user.parent!.pricePerMessage
      : m.user.pricePerMessage
    return price ?? null
  }

  const fmt = searchParams.get('format')
  if (fmt === 'csv') {
    const headers = ['Fecha','Destinatario','Canal','Estado','Usuario','Campaña','Costo','Mensaje']
    const lines = [
      headers.join(','),
      ...messages.map((m) => [
        new Date(m.createdAt).toISOString(),
        m.to,
        m.channel,
        m.status,
        `"${m.user.name}"`,
        `"${m.campaign?.name ?? ''}"`,
        effectivePrice(m)?.toFixed(4) ?? '',
        `"${m.content.replace(/"/g, "'")}"`,
      ].join(',')),
    ]
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="reporte-detalle.csv"',
      },
    })
  }

  return NextResponse.json({
    messages: messages.map((m) => ({
      ...m,
      cost: effectivePrice(m),
    })),
    total,
    pages: Math.ceil(total / limit),
    page,
  })
}
