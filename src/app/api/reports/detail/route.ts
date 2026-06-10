import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

function periodDates(period: string, from?: string, to?: string) {
  const now = new Date()
  if (period === 'today') {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    return { gte: start, lte: now }
  }
  if (period === 'week') {
    const start = new Date(now); start.setDate(now.getDate() - 7); start.setHours(0, 0, 0, 0)
    return { gte: start, lte: now }
  }
  if (period === 'month') {
    const start = new Date(now); start.setDate(1); start.setHours(0, 0, 0, 0)
    return { gte: start, lte: now }
  }
  if (period === 'custom' && from && to) {
    return { gte: new Date(from), lte: new Date(to + 'T23:59:59') }
  }
  return undefined
}

async function resolveUserIds(userId: string, role: string): Promise<string[]> {
  if (role === 'reseller') {
    const clients = await prisma.user.findMany({
      where: { parentId: userId },
      select: { id: true, children: { select: { id: true } } },
    })
    return [userId, ...clients.map(c => c.id), ...clients.flatMap(c => c.children.map(u => u.id))]
  }
  if (role === 'client') {
    const users = await prisma.user.findMany({ where: { parentId: userId }, select: { id: true } })
    return [userId, ...users.map(u => u.id)]
  }
  return [userId]
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const period       = searchParams.get('period') ?? 'week'
  const from         = searchParams.get('from') ?? undefined
  const to           = searchParams.get('to') ?? undefined
  const channel      = searchParams.get('channel') ?? undefined
  const resellerId   = searchParams.get('resellerId') ?? undefined
  const filterUserId = searchParams.get('userId') ?? undefined
  const page         = parseInt(searchParams.get('page') ?? '1')
  const limit        = 50

  const dateRange = periodDates(period, from, to)

  // Resolver qué userIds incluir
  let userIds: string[] | null = null // null = admin ve todo

  if (session.role !== 'admin') {
    userIds = await resolveUserIds(session.userId, session.role)
  }

  // Filtros adicionales de la UI
  if (filterUserId) {
    const childUsers = await prisma.user.findMany({ where: { parentId: filterUserId }, select: { id: true } })
    userIds = [filterUserId, ...childUsers.map(u => u.id)]
  } else if (resellerId && session.role === 'admin') {
    const clients = await prisma.user.findMany({
      where: { parentId: resellerId },
      select: { id: true, children: { select: { id: true } } },
    })
    userIds = [resellerId, ...clients.map(c => c.id), ...clients.flatMap(c => c.children.map(u => u.id))]
  }

  const where = {
    ...(userIds ? { userId: { in: userIds } } : {}),
    ...(dateRange ? { createdAt: dateRange } : {}),
    ...(channel ? { channel } : {}),
  }

  const fmt = searchParams.get('format')

  if (fmt === 'csv' || fmt === 'xlsx') {
    const all = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true } } },
    })

    if (fmt === 'csv') {
      const headers = ['Fecha', 'Destinatario', 'Remitente', 'Canal', 'Estado', 'Costo', 'Usuario', 'Mensaje']
      const lines = [
        headers.join(','),
        ...all.map((m) => [
          m.createdAt.toISOString(),
          m.to,
          m.from ?? '',
          m.channel,
          m.status,
          m.cost?.toFixed(4) ?? '',
          m.user.name,
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

    const headers = ['Fecha', 'Destinatario', 'Remitente', 'Canal', 'Estado', 'Costo', 'Usuario', 'Mensaje']
    const rows = all.map((m) => [
      m.createdAt.toISOString(),
      m.to,
      m.from ?? '',
      m.channel,
      m.status,
      m.cost ?? '',
      m.user.name,
      m.content,
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 20 }, { wch: 50 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle')
    const buf = Buffer.from(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="reporte-detalle.xlsx"',
      },
    })
  }

  const [total, messages] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { user: { select: { name: true } } },
    }),
  ])

  const result = messages.map((m) => ({
    id: m.id,
    to: m.to,
    content: m.content,
    channel: m.channel,
    status: m.status,
    cost: m.cost,
    createdAt: m.createdAt.toISOString(),
    sentAt: m.sentAt?.toISOString() ?? m.createdAt.toISOString(),
    user: { id: m.userId, name: m.user.name },
    campaign: null,
  }))

  return NextResponse.json({ messages: result, total, pages: Math.ceil(total / limit), page })
}
