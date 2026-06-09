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
  const period   = searchParams.get('period') ?? 'month'
  const from     = searchParams.get('from') ?? undefined
  const to       = searchParams.get('to') ?? undefined
  const channel  = searchParams.get('channel') ?? undefined
  const resellerId = searchParams.get('resellerId') ?? undefined
  const userId   = searchParams.get('userId') ?? undefined

  // Build user filter based on role
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

  if (userIds.length === 0) return NextResponse.json([])

  const createdAt = dateRange(period, from, to)

  // Fetch all users with their message counts
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      pricePerMessage: true,
      parent: { select: { id: true, name: true, pricePerMessage: true } },
      messages: {
        where: {
          ...(channel ? { channel } : {}),
          ...(createdAt ? { createdAt } : {}),
        },
        select: { channel: true, status: true },
      },
    },
    orderBy: { name: 'asc' },
  })

  const rows = users.map((u) => {
    const msgs = u.messages
    const total = msgs.length
    const sent = msgs.filter((m) => m.status === 'sent' || m.status === 'delivered').length
    const delivered = msgs.filter((m) => m.status === 'delivered').length
    const failed = msgs.filter((m) => m.status === 'failed').length
    const bySms = msgs.filter((m) => m.channel === 'sms').length
    const byWa  = msgs.filter((m) => m.channel === 'whatsapp').length
    const byRcs = msgs.filter((m) => m.channel === 'rcs').length

    // Admin sees: reseller's price for their clients (not what reseller charges clients)
    // Reseller sees: client's own price (what reseller charges them)
    const isAdminViewingResellerClient = session.role === 'admin' && u.parent != null
    const effectivePrice = isAdminViewingResellerClient
      ? u.parent!.pricePerMessage  // use reseller's price for cost, hide individual client price
      : u.pricePerMessage
    const visiblePrice = isAdminViewingResellerClient ? null : u.pricePerMessage
    const cost = effectivePrice != null ? total * effectivePrice : null

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      reseller: u.parent?.name ?? null,
      total, sent, delivered, failed,
      bySms, byWa, byRcs,
      pricePerMessage: visiblePrice,
      cost,
    }
  })

  const fmt = searchParams.get('format')
  if (fmt === 'csv') {
    const headers = ['Usuario','Email','Rol','Reseller','SMS','WhatsApp','RCS','Total','Enviados','Entregados','Fallidos','Precio/msg','Costo Total']
    const lines = [
      headers.join(','),
      ...rows.map((r) => [
        `"${r.name}"`, `"${r.email}"`, r.role, `"${r.reseller ?? ''}"`,
        r.bySms, r.byWa, r.byRcs, r.total, r.sent, r.delivered, r.failed,
        r.pricePerMessage ?? '', r.cost?.toFixed(2) ?? '',
      ].join(',')),
    ]
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="reporte-total.csv"',
      },
    })
  }

  return NextResponse.json(rows)
}
