export const revalidate = 60

import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/ui/stat-card'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MessageSquare, MessageCircle, Smartphone, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'

const channelColor: Record<string, string> = {
  sms:      'bg-sky-100 text-sky-700',
  whatsapp: 'bg-emerald-100 text-emerald-700',
  rcs:      'bg-violet-100 text-violet-700',
}

const STATUS: Record<string, { label: string; color: string }> = {
  delivered:   { label: 'Entregado',    color: 'bg-emerald-100 text-emerald-700' },
  failed:      { label: 'Fallido',      color: 'bg-rose-100 text-rose-700'      },
  undelivered: { label: 'No entregado', color: 'bg-rose-100 text-rose-700'      },
  rejected:    { label: 'Rechazado',    color: 'bg-rose-100 text-rose-700'      },
  pending:     { label: 'Pendiente',    color: 'bg-slate-100 text-slate-500'    },
  sent:        { label: 'Enviado',      color: 'bg-sky-100 text-sky-700'        },
}

export default async function DashboardPage() {
  const session = await getSession()
  const uid = session?.userId

  const now = new Date()
  const weekAgo = new Date(now)
  weekAgo.setDate(now.getDate() - 7)
  weekAgo.setHours(0, 0, 0, 0)

  const where     = { userId: uid }
  const whereWeek = { userId: uid, createdAt: { gte: weekAgo } }

  const [total, delivered, failed, pending, smsMsgs, waMsgs, rcsMsgs, recent, weekMsgs] =
    await Promise.all([
      prisma.message.count({ where }),
      prisma.message.count({ where: { ...where, status: 'delivered' } }),
      prisma.message.count({ where: { ...where, status: { in: ['failed', 'undelivered', 'rejected'] } } }),
      prisma.message.count({ where: { ...where, status: { in: ['pending', 'sent'] } } }),
      prisma.message.count({ where: { ...where, channel: 'sms' } }),
      prisma.message.count({ where: { ...where, channel: 'whatsapp' } }),
      prisma.message.count({ where: { ...where, channel: 'rcs' } }),
      prisma.message.findMany({ where, orderBy: { createdAt: 'desc' }, take: 10 }),
      prisma.message.findMany({ where: whereWeek, select: { createdAt: true } }),
    ])

  const rate = total > 0 ? Math.round((delivered / total) * 100) : 0

  // Agrupación por día (últimos 7 días)
  const byDay: Record<string, number> = {}
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    byDay[d.toISOString().slice(0, 10)] = 0
  }
  for (const m of weekMsgs) {
    const day = new Date(m.createdAt).toISOString().slice(0, 10)
    if (day in byDay) byDay[day]++
  }
  const maxDay = Math.max(...Object.values(byDay), 1)

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Dashboard" />

      <main className="flex-1 p-6 space-y-6">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Total mensajes" value={total}     icon={MessageSquare} color="sky"     subtitle="Todos los canales" />
          <StatCard title="Entregados"     value={delivered} icon={CheckCircle}   color="emerald" subtitle={`${rate}% tasa`} />
          <StatCard title="Fallidos"       value={failed}    icon={XCircle}       color="rose" />
          <StatCard title="En tránsito"    value={pending}   icon={Clock}         color="amber" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <StatCard title="SMS"      value={smsMsgs} icon={MessageSquare} color="sky" />
          <StatCard title="WhatsApp" value={waMsgs}  icon={MessageCircle} color="emerald" />
          <StatCard title="RCS"      value={rcsMsgs} icon={Smartphone}    color="violet" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Gráfica últimos 7 días */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-sky-600" />
              <h2 className="font-semibold text-slate-800 text-sm">Últimos 7 días</h2>
            </div>
            {weekMsgs.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Sin actividad esta semana</p>
            ) : (
              <div className="flex items-end gap-1.5 h-24">
                {Object.entries(byDay).map(([day, count]) => (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-sky-500 rounded-t-sm min-h-[2px]"
                      style={{ height: `${Math.max(2, Math.round((count / maxDay) * 88))}px` }}
                      title={`${count} msgs`}
                    />
                    <span className="text-[10px] text-slate-400">
                      {new Date(day + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mensajes recientes */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 text-sm">Mensajes recientes</h2>
            </div>
            {recent.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-400 text-sm">
                Sin mensajes todavía.{' '}
                <a href="/sms/send" className="text-sky-600 hover:underline">Envía el primero</a>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recent.map((msg) => {
                  const st = STATUS[msg.status]
                  return (
                    <div key={msg.id} className="px-5 py-3 flex items-center gap-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${channelColor[msg.channel] ?? 'bg-slate-100 text-slate-600'}`}>
                        {msg.channel.toUpperCase()}
                      </span>
                      <span className="text-sm text-slate-600 flex-1 truncate">{msg.to}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${st?.color ?? 'bg-slate-100 text-slate-500'}`}>
                        {st?.label ?? msg.status}
                      </span>
                      <span className="text-xs text-slate-400 hidden sm:block shrink-0">
                        {new Date(msg.createdAt).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
