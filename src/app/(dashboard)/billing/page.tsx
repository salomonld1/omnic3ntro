import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { BillingClient } from './_client'

export default async function BillingPage() {
  const session = await getSession()
  if (!session || !['admin', 'superadmin'].includes(session.role)) redirect('/dashboard')

  const accounts = await prisma.user.findMany({
    where: { role: { in: ['account', 'reseller', 'client'] } },
    select: {
      id: true, name: true, email: true, role: true,
      billingType: true, balance: true, creditLimit: true, balanceExpiresAt: true,
      balanceManager: true,
      parent: { select: { id: true, name: true } },
    },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-800">Gestión de saldos</h1>
        <p className="text-sm text-slate-500 mt-1">Asigna saldo o límites de crédito a clientes y resellers</p>
      </div>
      <BillingClient accounts={accounts} adminRole={session.role} />
    </div>
  )
}
