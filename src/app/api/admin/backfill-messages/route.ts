import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchSmsLogs } from '@/lib/infobip'

export async function POST(req: Request) {
  const cronSecret = req.headers instanceof Headers ? req.headers.get('x-cron-secret') : null
  const session = await getSession()
  const isAdmin = session?.role === 'admin'
  const isCron  = cronSecret === process.env.CRON_SECRET

  if (!isAdmin && !isCron) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const adminUser = await prisma.user.findFirst({ where: { role: 'admin' }, select: { id: true } })
  const adminId = adminUser?.id ?? ''

  // Mapa appId → userId
  const usersWithAppId = await prisma.user.findMany({
    where: { infobipAppId: { not: null } },
    select: { id: true, infobipAppId: true },
  })
  const appIdMap: Record<string, string> = {}
  for (const u of usersWithAppId) {
    if (u.infobipAppId) appIdMap[u.infobipAppId] = u.id
  }

  // Últimos 30 días
  const now = new Date()
  const monthAgo = new Date(now)
  monthAgo.setDate(now.getDate() - 30)

  const logs = await fetchSmsLogs({
    sentSince: monthAgo.toISOString(),
    sentUntil: now.toISOString(),
    limit: 1000,
  })

  if (logs.length === 0) {
    return NextResponse.json({ saved: 0, message: 'Sin mensajes en Infobip para el período' })
  }

  // Filtrar los que ya existen en Turso por messageId
  const incomingIds = logs.map((m) => m.messageId).filter(Boolean)
  const existing = await prisma.message.findMany({
    where: { messageId: { in: incomingIds } },
    select: { messageId: true },
  })
  const existingIds = new Set(existing.map((m) => m.messageId))

  const toInsert = logs.filter((m) => !existingIds.has(m.messageId))

  if (toInsert.length === 0) {
    return NextResponse.json({ saved: 0, message: 'Todos los mensajes ya estaban en Turso' })
  }

  const { count } = await prisma.message.createMany({
    data: toInsert.map((m) => ({
      to: m.to,
      from: m.from ?? null,
      content: m.text ?? '',
      channel: m.channel,
      status: m.statusGroup === 'DELIVERED' ? 'delivered'
            : ['UNDELIVERABLE', 'REJECTED'].includes(m.statusGroup) ? 'failed'
            : m.statusGroup === 'EXPIRED' ? 'failed'
            : 'sent',
      messageId: m.messageId,
      userId: appIdMap[m.appId ?? ''] ?? adminId,
      sentAt: m.sentAt ? new Date(m.sentAt) : new Date(),
    })),
  })

  return NextResponse.json({ saved: count, total: logs.length, skipped: logs.length - count })
}
