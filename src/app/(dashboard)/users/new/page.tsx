import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { NewUserForm } from './_form'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function NewUserPage() {
  const session = await getSession()
  if (!session || !['admin', 'reseller', 'client'].includes(session.role)) {
    redirect('/dashboard')
  }

  // Admin needs both resellers (to assign a client to) and direct clients (to assign a user to)
  const resellers = session.role === 'admin'
    ? await prisma.user.findMany({
        where: { role: 'reseller' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  const clients = session.role === 'admin'
    ? await prisma.user.findMany({
        where: { role: 'client' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  const title =
    session.role === 'reseller' ? 'Nuevo Cliente'  :
    session.role === 'client'   ? 'Nuevo Usuario'  :
    'Nuevo Usuario'

  const backLabel =
    session.role === 'reseller' ? 'Volver a Mis Clientes' :
    session.role === 'client'   ? 'Volver a Mis Usuarios' :
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
