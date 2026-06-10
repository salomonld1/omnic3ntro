import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { NewUserForm } from './_form'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function NewUserPage() {
  const session = await getSession()
  const ADMIN_ROLES = ['admin', 'superadmin']
  const allowed = [...ADMIN_ROLES, 'reseller', 'account', 'client']
  if (!session || !allowed.includes(session.role)) redirect('/dashboard')

  const isAdmin    = ADMIN_ROLES.includes(session.role)
  const isReseller = session.role === 'reseller'

  const resellers = isAdmin
    ? await prisma.user.findMany({
        where: { role: 'reseller' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  const clients = isAdmin
    ? await prisma.user.findMany({
        where: { role: { in: ['account', 'client'] } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : isReseller
    ? await prisma.user.findMany({
        where: { parentId: session.userId, role: { in: ['account', 'client'] } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  const title =
    isReseller                  ? 'Nuevo Cliente / Usuario' :
    session.role === 'account' || session.role === 'client' ? 'Nuevo Usuario' :
    'Nuevo Usuario'

  const backLabel =
    isReseller                  ? 'Volver' :
    session.role === 'account' || session.role === 'client' ? 'Volver a Mis Usuarios' :
    'Volver a Usuarios'

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title={title} />
      <main className="flex-1 p-6 max-w-2xl">
        <Link href="/users" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-5">
            {session.role === 'reseller' ? 'Crear nuevo cliente' :
             session.role === 'client'   ? 'Crear nuevo usuario' :
             'Crear nuevo usuario'}
          </h2>
          <NewUserForm viewerRole={session.role} resellers={resellers} clients={clients} />

        </div>
      </main>
    </div>
  )
}
