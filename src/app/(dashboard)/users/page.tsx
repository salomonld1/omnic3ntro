import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { UserList } from './_list'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function UsersPage() {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'reseller')) {
    redirect('/dashboard')
  }

  const where = session.role === 'admin' ? {} : { parentId: session.userId }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      parentId: true,
      apiKey: true,
      infobipBaseUrl: true,
      createdAt: true,
      parent: { select: { id: true, name: true } },
      _count: { select: { messages: true, campaigns: true, children: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Admin needs the list of resellers to filter/assign
  const resellers = session.role === 'admin'
    ? await prisma.user.findMany({
        where: { role: 'reseller' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
    : []

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title={session.role === 'reseller' ? 'Mis Clientes' : 'Usuarios'} />
      <main className="flex-1 p-6">
        <UserList initialUsers={users} resellers={resellers} viewerRole={session.role} />
      </main>
    </div>
  )
}
