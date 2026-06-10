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
  const period = searchParams.get('period') ?? 'month'
  const from   = searchParams.get('from') ?? undefined
  const to     = searchParams.get('to') ?? undefined

  const dates = periodDates(period, from, to)

  const [smsLogs, waLogs] = await Promise.all([
    fetchSmsLogs({ ...dates, limit: 1000 }),
    fetchWhatsAppLogs({ ...dates, limit: 1000 }),
  ])

  return NextResponse.json([{
    name: 'Plataforma',
    sms: smsLogs.length,
    whatsapp: waLogs.length,
    rcs: 0,
    total: smsLogs.length + waLogs.length,
  }])
}
