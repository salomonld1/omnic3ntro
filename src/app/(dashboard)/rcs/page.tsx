import { Header } from '@/components/layout/header'
import { StatCard } from '@/components/ui/stat-card'
import { Badge, statusVariant } from '@/components/ui/badge'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { Smartphone, Send, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export default async function RcsPage() {
  const session = await getSession()
  const [total, delivered, failed, messages] = await Promise.all([
    prisma.message.count({ where: { userId: session?.userId, channel: 'rcs' } }),
    prisma.message.count({ where: { userId: session?.userId, channel: 'rcs', status: 'delivered' } }),
    prisma.message.count({ where: { userId: session?.userId, channel: 'rcs', status: 'failed' } }),
    prisma.message.findMany({
      where: { userId: session?.userId, channel: 'rcs' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="RCS" />
      <main className="flex-1 p-6 space-y-6">
        <div className="flex gap-3">
          <Link href="/rcs/send" className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Send className="w-4 h-4" /> Enviar RCS
          </Link>
          <Link href="/rcs/bulk" className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors">
            <Send className="w-4 h-4" /> Envío masivo
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Total mensajes RCS" value={total} icon={Smartphone} color="violet" />
          <StatCard title="Entregados" value={delivered} icon={CheckCircle} color="emerald" />
          <StatCard title="Fallidos" value={failed} icon={XCircle} color="rose" />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm">Historial RCS</h2>
          </div>
          {messages.length === 0 ? (
            <div className="px-5 py-12 text-center text-slate-400 text-sm">
              No hay mensajes todavía.{' '}
              <Link href="/rcs/send" className="text-violet-600 hover:underline">Envía el primero</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Destinatario</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Mensaje</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {messages.map((msg) => (
                    <tr key={msg.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-medium text-slate-700">{msg.to}</td>
                      <td className="px-5 py-3 text-slate-500 max-w-xs truncate">{msg.content}</td>
                      <td className="px-5 py-3"><Badge variant={statusVariant(msg.status)}>{msg.status}</Badge></td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{formatDate(msg.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
