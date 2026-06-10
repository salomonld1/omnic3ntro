import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchSmsLogs, fetchWhatsAppLogs } from '@/lib/infobip'
import type { UnifiedLog } from '@/lib/infobip'

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

  const [smsLogs, waLogs] = await Promise.all([
    channel === 'whatsapp' ? [] : fetchSmsLogs({ ...dates, limit: 1000 }),
    channel === 'sms'      ? [] : fetchWhatsAppLogs({ ...dates, limit: 1000 }),
  ])

  const all: UnifiedLog[] = [...smsLogs, ...waLogs]
  all.sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))

  const total = all.length
  const paginated = all.slice((page - 1) * limit, page * limit)

  // Enrich with a generic user label (platform-level — all messages from one account)
  const result = paginated.map((m) => ({
    ...m,
    status: m.statusGroup.toLowerCase(),
    userName: 'Plataforma',
    cost: m.pricePerMessage,
  }))

  const fmt = searchParams.get('format')
  if (fmt === 'csv') {
    const headers = ['Fecha', 'Destinatario', 'Remitente', 'Canal', 'Estado', 'Costo', 'Mensaje']
    const lines = [
      headers.join(','),
      ...result.map((m) => [
        m.sentAt,
        m.to,
        m.from,
        m.channel,
        m.status,
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
