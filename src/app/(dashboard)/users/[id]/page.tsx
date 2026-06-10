import { redirect, notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { EditUserForm } from './_form'
import { getSession } from '@/lib/auth'
import { getEffectiveRole } from '@/lib/dev-role'
import { prisma } from '@/lib/prisma'

const ADMIN_ROLES = ['admin', 'superadmin']

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect('/dashboard')

  const viewerRole = await getEffectiveRole(session.role)
  const allowed = [...ADMIN_ROLES, 'reseller', 'account', 'client']
  if (!allowed.includes(viewerRole)) redirect('/dashboard')

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      parentId: true,
      apiKey: true,
      infobipApiKey: true,
      infobipBaseUrl: true,
      pricing: true,
      billingType: true,
      balance: true,
      balanceExpiresAt: true,
      creditLimit: true,
      parent: { select: { id: true, name: true } },
    },
  })

  if (!user) notFound()

  // Access control: resellers only edit their clients, accounts only edit their users
  if ((viewerRole === 'reseller' || viewerRole === 'account' || viewerRole === 'client') && user.parentId !== session.userId) {
    redirect('/users')
  }

  const resellers = ADMIN_ROLES.includes(viewerRole)
    ? await prisma.user.findMany({
        where: { role: 'reseller', NOT: { id } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  const backLabel =
    viewerRole === 'reseller'                               ? 'Volver a Mis Clientes' :
    viewerRole === 'account' || viewerRole === 'client'     ? 'Volver a Mis Usuarios' :
    'Volver a Usuarios'

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Editar" />
      <main className="flex-1 p-6 max-w-2xl">
        <Link href="/users" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </Link>
        <EditUserForm
          user={{ ...user, balanceExpiresAt: user.balanceExpiresAt?.toISOString() ?? null }}
          viewerRole={viewerRole}
          resellers={resellers}
        />
      </main>
    </div>
  )
}
