import { redirect, notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const TYPE_MAP: Record<string, { label: string; color: string }> = {
  topup:      { label: 'Recarga',       color: 'bg-emerald-100 text-emerald-700' },
  debit:      { label: 'Débito',        color: 'bg-rose-100 text-rose-700'      },
  limit_set:  { label: 'Límite',        color: 'bg-sky-100 text-sky-700'        },
  debt_reset: { label: 'Deuda saldada', color: 'bg-amber-100 text-amber-700'    },
}

export default async function TransactionsPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !['admin', 'reseller', 'client'].includes(session.role)) {
    redirect('/dashboard')
  }

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, parentId: true, balance: true, billingType: true },
  })

  if (!user) notFound()

  if (session.role === 'reseller' && user.parentId !== session.userId) redirect('/users')
  if (session.role === 'client' && user.parentId !== session.userId) redirect('/users')

  const transactions = await prisma.balanceTransaction.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
  })

  // Traer nombres de quienes crearon cada transacción
  const creatorIds = [...new Set(transactions.map((t) => t.createdById).filter(Boolean))] as string[]
  const creators = creatorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, name: true },
      })
    : []
  const creatorMap = Object.fromEntries(creators.map((c) => [c.id, c.name]))

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Historial de transacciones" />
      <main className="flex-1 p-6 max-w-4xl">
        <Link href={`/users/${id}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Volver a {user.name}
        </Link>

        <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 mb-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 mb-0.5">
              {user.billingType === 'prepaid' ? 'Saldo disponible' : 'Uso acumulado'}
            </p>
            <p className={`text-lg font-bold ${
              user.billingType === 'prepaid' && (user.balance ?? 0) <= 0
                ? 'text-rose-600'
                : user.billingType === 'postpaid'
                ? 'text-slate-800'
                : 'text-emerald-600'
            }`}>
              ${(user.balance ?? 0).toFixed(2)} MXN
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center text-slate-400 text-sm">
            Sin movimientos registrados.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Movimientos</p>
              <p className="text-xs text-slate-400">{transactions.length} registros</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Fecha</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Tipo</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Nota</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-left">Registrado por</th>
                    <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((t) => {
                    const type = TYPE_MAP[t.type] ?? { label: t.type, color: 'bg-slate-100 text-slate-600' }
                    const isCredit = t.amount >= 0
                    const creatorName = t.createdById ? (creatorMap[t.createdById] ?? 'Usuario eliminado') : null

                    return (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleDateString('es-MX', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                          <span className="text-xs text-slate-400 ml-1.5">
                            {new Date(t.createdAt).toLocaleTimeString('es-MX', {
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${type.color}`}>
                            {type.label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs max-w-xs truncate">{t.note ?? '—'}</td>
                        <td className="px-5 py-3.5 text-xs text-slate-500">
                          {creatorName ?? <span className="text-slate-300">—</span>}
                        </td>
                        <td className={`px-5 py-3.5 font-mono font-semibold text-right ${isCredit ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isCredit ? '+' : ''}{t.amount.toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
