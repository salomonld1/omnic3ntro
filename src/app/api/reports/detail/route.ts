import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchLogsForAppIds, resolveReportAppIds } from '@/lib/infobip'

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
  const all = await fetchLogsForAppIds(appIds, dates, channel)
  all.sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))

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
    user: { id: m.appId ?? 'platform', name: m.appId ?? 'Plataforma' },
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

  return NextResponse.json({ messages: result, total, pages: Math.ceil(total / limit), page })
}
