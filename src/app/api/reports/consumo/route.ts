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
  const period = searchParams.get('period') ?? 'month'
  const from   = searchParams.get('from') ?? undefined
  const to     = searchParams.get('to') ?? undefined
  const view   = searchParams.get('view') ?? 'reseller' // 'reseller' | 'client'

  const createdAt = dateRange(period, from, to)
  const msgWhere = createdAt ? { createdAt } : {}

  if (session.role === 'admin') {
    if (view === 'reseller') {
      // Group by reseller
      const resellers = await prisma.user.findMany({
        where: { role: 'reseller' },
        select: {
          id: true, name: true,
          children: {
            select: {
              messages: { where: msgWhere, select: { channel: true } },
            },
          },
          messages: { where: msgWhere, select: { channel: true } },
        },
        orderBy: { name: 'asc' },
      })

      // Also get direct clients (no reseller)
      const directClients = await prisma.user.findMany({
        where: { role: 'user', parentId: null },
        select: {
          id: true, name: true,
          messages: { where: msgWhere, select: { channel: true } },
        },
      })

      const rows = resellers.map((r) => {
        const allMsgs = [
          ...r.messages,
          ...r.children.flatMap((c) => c.messages),
        ]
        return {
          name: r.name,
          sms: allMsgs.filter((m) => m.channel === 'sms').length,
          whatsapp: allMsgs.filter((m) => m.channel === 'whatsapp').length,
          rcs: allMsgs.filter((m) => m.channel === 'rcs').length,
          total: allMsgs.length,
        }
      })

      const directTotal = directClients.flatMap((c) => c.messages)
      if (directTotal.length > 0) {
        rows.push({
          name: 'Clientes directos',
          sms: directTotal.filter((m) => m.channel === 'sms').length,
          whatsapp: directTotal.filter((m) => m.channel === 'whatsapp').length,
          rcs: directTotal.filter((m) => m.channel === 'rcs').length,
          total: directTotal.length,
        })
      }

      return NextResponse.json(rows)
    }

    // view === 'client' — all users grouped individually
    const users = await prisma.user.findMany({
      where: { role: { not: 'admin' } },
      select: {
        id: true, name: true, role: true,
        parent: { select: { name: true } },
        messages: { where: msgWhere, select: { channel: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(users.map((u) => ({
      name: u.name,
      reseller: u.parent?.name ?? null,
      role: u.role,
      sms: u.messages.filter((m) => m.channel === 'sms').length,
      whatsapp: u.messages.filter((m) => m.channel === 'whatsapp').length,
      rcs: u.messages.filter((m) => m.channel === 'rcs').length,
      total: u.messages.length,
    })))
  }

  if (session.role === 'reseller') {
    const clients = await prisma.user.findMany({
      where: { parentId: session.userId },
      select: {
        id: true, name: true,
        messages: { where: msgWhere, select: { channel: true } },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(clients.map((c) => ({
      name: c.name,
      sms: c.messages.filter((m) => m.channel === 'sms').length,
      whatsapp: c.messages.filter((m) => m.channel === 'whatsapp').length,
      rcs: c.messages.filter((m) => m.channel === 'rcs').length,
      total: c.messages.length,
    })))
  }

  // User — own consumption
  const msgs = await prisma.message.findMany({
    where: { userId: session.userId, ...msgWhere },
    select: { channel: true },
  })

  return NextResponse.json([{
    name: 'Mi consumo',
    sms: msgs.filter((m) => m.channel === 'sms').length,
    whatsapp: msgs.filter((m) => m.channel === 'whatsapp').length,
    rcs: msgs.filter((m) => m.channel === 'rcs').length,
    total: msgs.length,
  }])
}
