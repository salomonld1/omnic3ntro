import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/ui/stat-card'
import { Badge, statusVariant } from '@/components/ui/badge'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { MessageSquare, MessageCircle, Smartphone, CheckCircle, XCircle, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const session = await getSession()

  const [totalMessages, deliveredMessages, failedMessages, pendingMessages, recentMessages, campaigns] =
    await Promise.all([
      prisma.message.count({ where: { userId: session?.userId } }),
      prisma.message.count({ where: { userId: session?.userId, status: 'delivered' } }),
      prisma.message.count({ where: { userId: session?.userId, status: 'failed' } }),
      prisma.message.count({ where: { userId: session?.userId, status: 'pending' } }),
      prisma.message.findMany({
        where: { userId: session?.userId },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.campaign.findMany({
        where: { userId: session?.userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

  const smsMsgs = await prisma.message.count({ where: { userId: session?.userId, channel: 'sms' } })
  const waMsgs = await prisma.message.count({ where: { userId: session?.userId, channel: 'whatsapp' } })
  const rcsMsgs = await prisma.message.count({ where: { userId: session?.userId, channel: 'rcs' } })

  const channelColors: Record<string, string> = {
    sms: 'bg-sky-100 text-sky-700',
    whatsapp: 'bg-emerald-100 text-emerald-700',
    rcs: 'bg-violet-100 text-violet-700',
  }

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Dashboard" />

      <main className="flex-1 p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Total mensajes" value={totalMessages} icon={MessageSquare} color="sky" subtitle="Todos los canales" />
          <StatCard title="Entregados" value={deliveredMessages} icon={CheckCircle} color="emerald" />
          <StatCard title="Fallidos" value={failedMessages} icon={XCircle} color="rose" />
          <StatCard title="Pendientes" value={pendingMessages} icon={Clock} color="amber" />
        </div>

        {/* Channels */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="SMS" value={smsMsgs} icon={MessageSquare} color="sky" />
          <StatCard title="WhatsApp" value={waMsgs} icon={MessageCircle} color="emerald" />
          <StatCard title="RCS" value={rcsMsgs} icon={Smartphone} color="violet" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Recent messages */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 text-sm">Mensajes recientes</h2>
            </div>
            {recentMessages.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-400 text-sm">
                No hay mensajes todavía. <a href="/sms/send" className="text-sky-600 hover:underline">Envía el primero</a>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentMessages.map((msg) => (
                  <div key={msg.id} className="px-5 py-3 flex items-center gap-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${channelColors[msg.channel] ?? 'bg-slate-100 text-slate-600'}`}>
                      {msg.channel.toUpperCase()}
                    </span>
                    <span className="text-sm text-slate-600 flex-1 truncate">{msg.to}</span>
                    <Badge variant={statusVariant(msg.status)}>{msg.status}</Badge>
                    <span className="text-xs text-slate-400 hidden sm:block">{formatDate(msg.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campaigns */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 text-sm">Campañas recientes</h2>
              <a href="/sms/bulk" className="text-xs text-sky-600 hover:underline">Ver todas</a>
            </div>
            {campaigns.length === 0 ? (
              <div className="px-5 py-10 text-center text-slate-400 text-sm">
                No hay campañas todavía. <a href="/sms/bulk" className="text-sky-600 hover:underline">Crea una</a>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {campaigns.map((c) => (
                  <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{c.name}</p>
                      <p className="text-xs text-slate-400">{c.total} mensajes · {c.channel.toUpperCase()}</p>
                    </div>
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
