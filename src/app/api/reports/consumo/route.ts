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
  const period = searchParams.get('period') ?? 'month'
  const from   = searchParams.get('from') ?? undefined
  const to     = searchParams.get('to') ?? undefined

  const dates = periodDates(period, from, to)
  const appIds = await resolveReportAppIds(session.userId, session.role)
  const allLogs = await fetchLogsForAppIds(appIds, dates)

  return NextResponse.json([{
    name: 'Plataforma',
    sms: allLogs.filter((m) => m.channel === 'sms').length,
    whatsapp: allLogs.filter((m) => m.channel === 'whatsapp').length,
    rcs: 0,
    total: allLogs.length,
  }])
}
