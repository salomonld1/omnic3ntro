import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/ui/stat-card'
import { Badge, statusVariant } from '@/components/ui/badge'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { BarChart3, MessageSquare, MessageCircle, Smartphone, CheckCircle } from 'lucide-react'

export default async function ReportsPage() {
  const session = await getSession()

  const [smsTotal, waTotal, rcsTotal, deliveredAll, messages, campaigns] = await Promise.all([
    prisma.message.count({ where: { userId: session?.userId, channel: 'sms' } }),
    prisma.message.count({ where: { userId: session?.userId, channel: 'whatsapp' } }),
    prisma.message.count({ where: { userId: session?.userId, channel: 'rcs' } }),
    prisma.message.count({ where: { userId: session?.userId, status: 'delivered' } }),
    prisma.message.findMany({
      where: { userId: session?.userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
    prisma.campaign.findMany({
      where: { userId: session?.userId },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const total = smsTotal + waTotal + rcsTotal
  const deliveryRate = total > 0 ? Math.round((deliveredAll / total) * 100) : 0

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Reportes" />
      <main className="flex-1 p-6 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard title="SMS totales" value={smsTotal} icon={MessageSquare} color="sky" />
          <StatCard title="WhatsApp" value={waTotal} icon={MessageCircle} color="emerald" />
          <StatCard title="RCS" value={rcsTotal} icon={Smartphone} color="violet" />
          <StatCard title="Tasa de entrega" value={`${deliveryRate}%`} icon={CheckCircle} color="emerald" />
        </div>

        {/* Campaigns table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-sky-600" /> Rendimiento de campañas
            </h2>
          </div>
          {campaigns.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 text-sm">No hay campañas todavía</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Campaña</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Canal</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Entregados</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Fallidos</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Tasa</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.map((c) => {
                    const rate = c.total > 0 ? Math.round((c.delivered / c.total) * 100) : 0
                    return (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-medium text-slate-700">{c.name}</td>
                        <td className="px-5 py-3"><Badge variant={c.channel as 'sms' | 'whatsapp' | 'rcs'}>{c.channel.toUpperCase()}</Badge></td>
                        <td className="px-5 py-3 text-right text-slate-600">{c.total}</td>
                        <td className="px-5 py-3 text-right text-emerald-600 font-medium">{c.delivered}</td>
                        <td className="px-5 py-3 text-right text-rose-500">{c.failed}</td>
                        <td className="px-5 py-3 text-right font-medium text-slate-700">{rate}%</td>
                        <td className="px-5 py-3"><Badge variant={statusVariant(c.status)}>{c.status}</Badge></td>
                        <td className="px-5 py-3 text-slate-400 text-xs">{formatDate(c.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Message log */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm">Log de mensajes (últimos 30)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Canal</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Destino</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Mensaje</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">Sin mensajes</td></tr>
                ) : messages.map((msg) => (
                  <tr key={msg.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3"><Badge variant={msg.channel as 'sms' | 'whatsapp' | 'rcs'}>{msg.channel.toUpperCase()}</Badge></td>
                    <td className="px-5 py-3 font-medium text-slate-700">{msg.to}</td>
                    <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{msg.content}</td>
                    <td className="px-5 py-3"><Badge variant={statusVariant(msg.status)}>{msg.status}</Badge></td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{formatDate(msg.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
