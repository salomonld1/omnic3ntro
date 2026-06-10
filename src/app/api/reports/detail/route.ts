import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchLogsForAppIds, resolveReportAppIds } from '@/lib/infobip'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

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
  const period  = searchParams.get('period') ?? 'month'
  const from    = searchParams.get('from') ?? undefined
  const to      = searchParams.get('to') ?? undefined
  const channel = searchParams.get('channel') ?? undefined
  const page    = parseInt(searchParams.get('page') ?? '1')
  const limit   = 50

  const dates = periodDates(period, from, to)
  const appIds = await resolveReportAppIds(session.userId, session.role)
  const [all, usersWithApp, sessionUser] = await Promise.all([
    fetchLogsForAppIds(appIds, dates, channel),
    prisma.user.findMany({ where: { infobipAppId: { not: null } }, select: { infobipAppId: true, name: true } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
  ])
  all.sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))

  const appIdToName: Record<string, string> = {}
  for (const u of usersWithApp) {
    if (u.infobipAppId) appIdToName[u.infobipAppId] = u.name
  }
  const fallbackName = sessionUser?.name ?? 'Desconocido'

  const total = all.length
  const paginated = all.slice((page - 1) * limit, page * limit)

  const result = paginated.map((m) => ({
    id: m.messageId,
    to: m.to,
    content: m.text,
    channel: m.channel,
    status: m.statusGroup.toLowerCase(),
    cost: m.pricePerMessage,
    createdAt: m.sentAt,
    sentAt: m.sentAt,
    user: { id: m.appId ?? 'platform', name: appIdToName[m.appId ?? ''] ?? fallbackName },
    campaign: null,
  }))

  const fmt = searchParams.get('format')

  if (fmt === 'csv') {
    const headers = ['Fecha', 'Destinatario', 'Remitente', 'Canal', 'Estado', 'Costo', 'Mensaje']
    const lines = [
      headers.join(','),
      ...all.map((m) => [
        m.sentAt,
        m.to,
        m.from,
        m.channel,
        m.statusGroup,
        m.pricePerMessage?.toFixed(4) ?? '',
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

  if (fmt === 'xlsx') {
    const headers = ['Fecha', 'Destinatario', 'Remitente', 'Canal', 'Estado', 'Costo', 'Mensaje']
    const rows = all.map((m) => [
      m.sentAt,
      m.to,
      m.from,
      m.channel,
      m.statusGroup,
      m.pricePerMessage ?? '',
      m.text,
    ])
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
    ws['!cols'] = [{ wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 50 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle')
    const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="reporte-detalle.xlsx"',
      },
    })
  }

  return NextResponse.json({ messages: result, total, pages: Math.ceil(total / limit), page })
}
