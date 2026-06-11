import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchSmsLogs } from '@/lib/infobip'
import { sendBalanceAlert } from '@/lib/email'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  // Rango: ayer 00:00 – 23:59
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const endOfYesterday = new Date(yesterday)
  endOfYesterday.setHours(23, 59, 59, 999)

  const sentSince = yesterday.toISOString()
  const sentUntil = endOfYesterday.toISOString()

  // Obtener todos los clientes/resellers con appId
  const clients = await prisma.user.findMany({
    where: {
      role: { in: ['client', 'reseller'] },
      infobipAppId: { not: null },
    },
    select: { id: true, name: true, email: true, infobipAppId: true, pricePerMessage: true },
  })

  const results: Array<{
    clientId: string
    clientName: string
    appId: string
    infobipCount: number
    tursoCount: number
    diff: number
  }> = []

  for (const client of clients) {
    // Conteo desde Infobip
    const infobipLogs = await fetchSmsLogs({
      sentSince,
      sentUntil,
      applicationId: client.infobipAppId!,
      limit: 1000,
    })
    const infobipCount = infobipLogs.length

    // Conteo desde Turso — sumar messageCount del campo note
    const transactions = await prisma.balanceTransaction.findMany({
      where: {
        userId: client.id,
        type: 'debit',
        createdAt: { gte: yesterday, lte: endOfYesterday },
      },
      select: { note: true },
    })
    const tursoCount = transactions.reduce((sum, t) => {
      const match = /^(\d+) mensaje/.exec(t.note ?? '')
      return sum + (match ? parseInt(match[1]) : 0)
    }, 0)

    const diff = infobipCount - tursoCount
    results.push({
      clientId: client.id,
      clientName: client.name,
      appId: client.infobipAppId!,
      infobipCount,
      tursoCount,
      diff,
    })
  }

  const discrepancies = results.filter((r) => r.diff !== 0)
  const date = yesterday.toISOString().slice(0, 10)

  // Log resultado
  const logLine = JSON.stringify({ date, results, discrepancies: discrepancies.length })
  console.log('[CUADRAJE]', logLine)

  // Email si hay diferencias y Resend está configurado
  if (discrepancies.length > 0 && process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
    const lines = discrepancies.map(
      (r) => `${r.clientName} (${r.appId}): Infobip=${r.infobipCount} / Turso=${r.tursoCount} / Diff=${r.diff > 0 ? '+' : ''}${r.diff}`
    ).join('\n')

    await sendBalanceAlert({
      to: process.env.ADMIN_EMAIL,
      clientName: `Cuadraje ${date} — ${discrepancies.length} diferencia(s)`,
      balance: discrepancies.reduce((s, r) => s + Math.abs(r.diff), 0),
      alertAmount: 0,
    }).catch(() => {})

    console.log('[CUADRAJE] Diferencias:\n' + lines)
  }

  return NextResponse.json({
    date,
    total: results.length,
    discrepancies: discrepancies.length,
    results,
  })
}
