import { redirect, notFound } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { EditUserForm } from './_form'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'reseller')) {
    redirect('/dashboard')
  }

  const { id } = await params

  // Verify the viewer can manage this user
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
      pricePerMessage: true,
      parent: { select: { id: true, name: true } },
    },
  })

  if (!user) notFound()

  // Reseller can only edit their own children
  if (session.role === 'reseller' && user.parentId !== session.userId) {
    redirect('/users')
  }

  const resellers = session.role === 'admin'
    ? await prisma.user.findMany({
        where: { role: 'reseller', NOT: { id } },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Editar Usuario" />
      <main className="flex-1 p-6 max-w-2xl">
        <Link href="/users" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          {session.role === 'reseller' ? 'Volver a Mis Clientes' : 'Volver a Usuarios'}
        </Link>
        <EditUserForm user={user} viewerRole={session.role} resellers={resellers} />
      </main>
    </div>
  )
}
