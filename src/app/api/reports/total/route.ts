import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchSmsLogs, fetchWhatsAppLogs } from '@/lib/infobip'

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

  const dates = periodDates(period, from, to)

  const [smsLogs, waLogs] = await Promise.all([
    channel === 'whatsapp' ? [] : fetchSmsLogs({ ...dates, limit: 1000 }),
    channel === 'sms'      ? [] : fetchWhatsAppLogs({ ...dates, limit: 1000 }),
  ])

  const totalSms = smsLogs.length
  const totalWa  = waLogs.length
  const total    = totalSms + totalWa

  const allLogs = [...smsLogs, ...waLogs]
  const delivered = allLogs.filter((m) => m.statusGroup === 'DELIVERED').length
  const failed    = allLogs.filter((m) => ['UNDELIVERABLE', 'REJECTED', 'EXPIRED'].includes(m.statusGroup)).length
  const cost      = allLogs.reduce((sum, m) => sum + (m.pricePerMessage ?? 0), 0)

  const row = {
    id: 'platform',
    name: 'Plataforma',
    email: '',
    role: session.role,
    reseller: null,
    total,
    sent: total,
    delivered,
    failed,
    bySms: totalSms,
    byWa: totalWa,
    byRcs: 0,
    pricePerMessage: null,
    cost: cost > 0 ? cost : null,
  }

  const fmt = searchParams.get('format')
  if (fmt === 'csv') {
    const headers = ['Usuario', 'SMS', 'WhatsApp', 'RCS', 'Total', 'Entregados', 'Fallidos', 'Costo Total']
    const lines = [
      headers.join(','),
      [
        `"${row.name}"`,
        row.bySms, row.byWa, row.byRcs, row.total,
        row.delivered, row.failed,
        row.cost?.toFixed(2) ?? '',
      ].join(','),
    ]
    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="reporte-resumen.csv"',
      },
    })
  }

  return NextResponse.json([row])
}
