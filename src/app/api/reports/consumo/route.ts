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

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const period = searchParams.get('period') ?? 'month'
  const from   = searchParams.get('from') ?? undefined
  const to     = searchParams.get('to') ?? undefined
  const view   = searchParams.get('view') ?? 'reseller' // 'reseller' | 'client'

  const dates = periodDates(period, from, to)

  const [smsLogs, waLogs] = await Promise.all([
    fetchSmsLogs({ ...dates, limit: 1000 }),
    fetchWhatsAppLogs({ ...dates, limit: 1000 }),
  ])

  // Build map: clientReference → { sms, whatsapp }
  const msgMap = new Map<string, { sms: number; whatsapp: number }>()
  function inc(ref: string | null | undefined, ch: 'sms' | 'whatsapp') {
    if (!ref) return
    if (!msgMap.has(ref)) msgMap.set(ref, { sms: 0, whatsapp: 0 })
    msgMap.get(ref)![ch]++
  }
  for (const m of smsLogs as InfobipSmsLog[]) inc(m.clientReference, 'sms')
  for (const m of waLogs as InfobipWhatsAppLog[]) inc(m.callbackData, 'whatsapp')

  if (session.role === 'admin') {
    if (view === 'reseller') {
      const resellers = await prisma.user.findMany({
        where: { role: 'reseller' },
        select: {
          id: true,
          name: true,
          children: { select: { id: true, children: { select: { id: true } } } },
        },
        orderBy: { name: 'asc' },
      })

      const rows = resellers.map((r) => {
        const allIds = [
          r.id,
          ...r.children.map((c) => c.id),
          ...r.children.flatMap((c) => c.children.map((u) => u.id)),
        ]
        const sms = allIds.reduce((sum, id) => sum + (msgMap.get(id)?.sms ?? 0), 0)
        const whatsapp = allIds.reduce((sum, id) => sum + (msgMap.get(id)?.whatsapp ?? 0), 0)
        return { name: r.name, sms, whatsapp, rcs: 0, total: sms + whatsapp }
      })

      // Direct clients (no reseller)
      const directClients = await prisma.user.findMany({
        where: { role: { in: ['client', 'user'] }, parentId: null },
        select: { id: true },
      })
      const directSms = directClients.reduce((sum, c) => sum + (msgMap.get(c.id)?.sms ?? 0), 0)
      const directWa  = directClients.reduce((sum, c) => sum + (msgMap.get(c.id)?.whatsapp ?? 0), 0)
      if (directSms + directWa > 0) {
        rows.push({ name: 'Clientes directos', sms: directSms, whatsapp: directWa, rcs: 0, total: directSms + directWa })
      }

      return NextResponse.json(rows)
    }

    // view === 'client'
    const users = await prisma.user.findMany({
      where: { role: { not: 'admin' } },
      select: { id: true, name: true, role: true, parent: { select: { name: true } } },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(users.map((u) => {
      const c = msgMap.get(u.id) ?? { sms: 0, whatsapp: 0 }
      return { name: u.name, reseller: u.parent?.name ?? null, role: u.role, sms: c.sms, whatsapp: c.whatsapp, rcs: 0, total: c.sms + c.whatsapp }
    }))
  }

  if (session.role === 'reseller') {
    const clients = await prisma.user.findMany({
      where: { parentId: session.userId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json(clients.map((c) => {
      const m = msgMap.get(c.id) ?? { sms: 0, whatsapp: 0 }
      return { name: c.name, sms: m.sms, whatsapp: m.whatsapp, rcs: 0, total: m.sms + m.whatsapp }
    }))
  }

  if (session.role === 'client') {
    const children = await prisma.user.findMany({
      where: { parentId: session.userId },
      select: { id: true },
    })
    const allIds = [session.userId, ...children.map((c) => c.id)]
    const sms = allIds.reduce((sum, id) => sum + (msgMap.get(id)?.sms ?? 0), 0)
    const wa  = allIds.reduce((sum, id) => sum + (msgMap.get(id)?.whatsapp ?? 0), 0)
    return NextResponse.json([{ name: 'Mi consumo', sms, whatsapp: wa, rcs: 0, total: sms + wa }])
  }

  // user
  const m = msgMap.get(session.userId) ?? { sms: 0, whatsapp: 0 }
  return NextResponse.json([{ name: 'Mi consumo', sms: m.sms, whatsapp: m.whatsapp, rcs: 0, total: m.sms + m.whatsapp }])
}
