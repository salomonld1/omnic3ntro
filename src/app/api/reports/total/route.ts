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
  const period     = searchParams.get('period') ?? 'month'
  const from       = searchParams.get('from') ?? undefined
  const to         = searchParams.get('to') ?? undefined
  const channel    = searchParams.get('channel') ?? undefined
  const resellerId = searchParams.get('resellerId') ?? undefined
  const filterUser = searchParams.get('userId') ?? undefined

  // Determine allowed userIds
  let allowedUserIds: Set<string> | null = null // null = no restriction (admin)

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
    allowedUserIds = new Set([...clientIds, ...childUsers.map((u) => u.id)])
  } else if (session.role === 'client') {
    const childUsers = await prisma.user.findMany({
      where: { parentId: session.userId },
      select: { id: true },
    })
    allowedUserIds = new Set([session.userId, ...childUsers.map((u) => u.id)])
  } else if (session.role === 'user') {
    allowedUserIds = new Set([session.userId])
  }

  // Admin can filter by reseller
  if (session.role === 'admin' && resellerId) {
    const clients = await prisma.user.findMany({
      where: { parentId: resellerId },
      select: { id: true },
    })
    const clientIds = clients.map((c) => c.id)
    const childUsers = await prisma.user.findMany({
      where: { parentId: { in: clientIds } },
      select: { id: true },
    })
    allowedUserIds = new Set([resellerId, ...clientIds, ...childUsers.map((u) => u.id)])
  }

  if (filterUser) {
    if (!allowedUserIds || allowedUserIds.has(filterUser)) {
      allowedUserIds = new Set([filterUser])
    }
  }

  const dates = periodDates(period, from, to)

  const [smsLogs, waLogs] = await Promise.all([
    channel === 'whatsapp' ? [] : fetchSmsLogs({ ...dates, limit: 1000 }),
    channel === 'sms'      ? [] : fetchWhatsAppLogs({ ...dates, limit: 1000 }),
  ])

  // Count per clientReference
  const counts = new Map<string, { sms: number; whatsapp: number; sent: number; failed: number }>()

  function getOrCreate(ref: string) {
    if (!counts.has(ref)) counts.set(ref, { sms: 0, whatsapp: 0, sent: 0, failed: 0 })
    return counts.get(ref)!
  }

  for (const m of smsLogs as InfobipSmsLog[]) {
    const ref = m.clientReference
    if (!ref) continue
    if (allowedUserIds && !allowedUserIds.has(ref)) continue
    const c = getOrCreate(ref)
    c.sms++
    if (m.status?.groupName === 'DELIVERED') c.sent++
    else if (['UNDELIVERABLE', 'REJECTED', 'EXPIRED'].includes(m.status?.groupName)) c.failed++
    else c.sent++ // ACCEPTED/PENDING count as sent
  }

  for (const m of waLogs as InfobipWhatsAppLog[]) {
    const ref = m.callbackData
    if (!ref) continue
    if (allowedUserIds && !allowedUserIds.has(ref)) continue
    const c = getOrCreate(ref)
    c.whatsapp++
    if (m.status?.groupName === 'DELIVERED') c.sent++
    else if (['UNDELIVERABLE', 'REJECTED', 'EXPIRED'].includes(m.status?.groupName)) c.failed++
    else c.sent++
  }

  if (counts.size === 0) return NextResponse.json([])

  // Enrich with user info
  const refIds = [...counts.keys()]
  const users = await prisma.user.findMany({
    where: { id: { in: refIds } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      pricePerMessage: true,
      parent: { select: { id: true, name: true, pricePerMessage: true } },
    },
    orderBy: { name: 'asc' },
  })

  const rows = users.map((u) => {
    const c = counts.get(u.id) ?? { sms: 0, whatsapp: 0, sent: 0, failed: 0 }
    const total = c.sms + c.whatsapp

    const isAdminViewingResellerClient = session.role === 'admin' && u.parent != null
    const effectivePrice = isAdminViewingResellerClient
      ? u.parent!.pricePerMessage
      : u.pricePerMessage
    const visiblePrice = isAdminViewingResellerClient ? null : u.pricePerMessage
    const cost = effectivePrice != null ? total * effectivePrice : null

    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      reseller: u.parent?.name ?? null,
      total,
      sent: c.sent,
      delivered: c.sent,
      failed: c.failed,
      bySms: c.sms,
      byWa: c.whatsapp,
      byRcs: 0,
      pricePerMessage: visiblePrice,
      cost,
    }
  })

  const fmt = searchParams.get('format')
  if (fmt === 'csv') {
    const headers = ['Usuario', 'Email', 'Rol', 'Reseller', 'SMS', 'WhatsApp', 'RCS', 'Total', 'Enviados', 'Fallidos', 'Precio/msg', 'Costo Total']
    const lines = [
      headers.join(','),
      ...rows.map((r) => [
        `"${r.name}"`, `"${r.email}"`, r.role, `"${r.reseller ?? ''}"`,
        r.bySms, r.byWa, r.byRcs, r.total, r.sent, r.failed,
        r.pricePerMessage ?? '', r.cost?.toFixed(2) ?? '',
      ].join(',')),
    ]
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="reporte-resumen.csv"',
      },
    })
  }

  return NextResponse.json(rows)
}
