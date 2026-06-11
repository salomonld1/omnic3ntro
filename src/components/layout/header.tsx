import { getSession } from '@/lib/auth'
import { getEffectiveRole } from '@/lib/dev-role'
import { prisma } from '@/lib/prisma'
import { Bell, Wallet } from 'lucide-react'

interface HeaderProps {
  title: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

export async function Header({ title }: HeaderProps) {
  const session = await getSession()
  const effectiveRole = session ? await getEffectiveRole(session.role) : 'user'
  const isAccount = effectiveRole === 'account' || effectiveRole === 'client'

  let balance: number | null = null
  let billingType: string | null = null
  let creditLimit: number | null = null

  if (isAccount && session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { balance: true, billingType: true, creditLimit: true },
    })
    balance    = user?.balance ?? null
    billingType = user?.billingType ?? null
    creditLimit = user?.creditLimit ?? null
  }

  const balanceLow  = billingType === 'prepaid'  && balance != null && balance <= 0
  const creditFull  = billingType === 'postpaid' && balance != null && creditLimit != null && balance >= creditLimit

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Balance chip — solo para cuentas/clientes */}
        {isAccount && billingType && balance != null && (
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium ${
            balanceLow || creditFull
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <Wallet className="w-4 h-4" />
            {billingType === 'prepaid' && (
              <span>
                Saldo: <span className="font-semibold">{fmt(balance)}</span>
              </span>
            )}
            {billingType === 'postpaid' && (
              <span>
                Uso: <span className="font-semibold">{fmt(balance)}</span>
                {creditLimit != null && (
                  <span className="text-xs opacity-70"> / {fmt(creditLimit)}</span>
                )}
              </span>
            )}
          </div>
        )}

        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors relative">
          <Bell className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-sm font-medium">
            {session?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-700">{session?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{effectiveRole}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
