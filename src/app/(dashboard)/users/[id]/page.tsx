import { redirect, notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { EditUserForm } from './_form'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || !['admin', 'reseller', 'client'].includes(session.role)) {
    redirect('/dashboard')
  }

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

  // Reseller can only edit their direct clients (role='client')
  if (session.role === 'reseller' && user.parentId !== session.userId) {
    redirect('/users')
  }

  // Client can only edit their direct users (role='user')
  if (session.role === 'client' && user.parentId !== session.userId) {
    redirect('/users')
  }

  const resellers = session.role === 'admin'
    ? await prisma.user.findMany({
        where: { role: 'reseller', NOT: { id } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  const backLabel =
    session.role === 'reseller' ? 'Volver a Mis Clientes' :
    session.role === 'client'   ? 'Volver a Mis Usuarios' :
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
          viewerRole={session.role}
          resellers={resellers}
        />
      </main>
    </div>
  )
}
