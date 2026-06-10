import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { NewUserForm } from './_form'
import { getSession } from '@/lib/auth'
import { getEffectiveRole } from '@/lib/dev-role'
import { prisma } from '@/lib/prisma'

const ADMIN_ROLES = ['admin', 'superadmin']

export default async function NewUserPage() {
  const session = await getSession()
  if (!session) redirect('/dashboard')

  // Use effective role (dev selector in dev, real role in prod)
  const viewerRole = await getEffectiveRole(session.role)

  const allowed = [...ADMIN_ROLES, 'reseller', 'account', 'client']
  if (!allowed.includes(viewerRole)) redirect('/dashboard')

  const isAdmin    = ADMIN_ROLES.includes(viewerRole)
  const isReseller = viewerRole === 'reseller'
  const isAccount  = viewerRole === 'account' || viewerRole === 'client'

  // Data queries use real session for security
  const realIsAdmin    = ADMIN_ROLES.includes(session.role)
  const realIsReseller = session.role === 'reseller'

  const resellers = realIsAdmin
    ? await prisma.user.findMany({
        where: { role: 'reseller' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  const clients = realIsAdmin
    ? await prisma.user.findMany({
        where: { role: { in: ['account', 'client'] } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : realIsReseller
    ? await prisma.user.findMany({
        where: { parentId: session.userId, role: { in: ['account', 'client'] } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  const title =
    isReseller ? 'Nuevo Cliente / Usuario' :
    isAccount  ? 'Nuevo Usuario' :
    'Nuevo Usuario'

  const backLabel =
    isReseller ? 'Volver' :
    isAccount  ? 'Volver a Mis Usuarios' :
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
            {isReseller ? 'Crear nuevo cliente o usuario' :
             isAccount  ? 'Crear nuevo usuario' :
             'Crear nuevo usuario'}
          </h2>
          <NewUserForm viewerRole={viewerRole} resellers={resellers} clients={clients} />
        </div>
      </main>
    </div>
  )
}
