import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { UserList } from '../_list'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function AdminUsersPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    redirect('/dashboard')
  }

  const users = await prisma.user.findMany({
    where: { role: 'admin' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      parentId: true,
      apiKey: true,
      infobipBaseUrl: true,
      billingType: true,
      balance: true,
      balanceExpiresAt: true,
      creditLimit: true,
      createdAt: true,
      parent: { select: { id: true, name: true, parentId: true } },
      _count: { select: { messages: true, campaigns: true, children: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Administradores" />
      <main className="flex-1 p-6">
        <UserList
          initialUsers={users.map((u) => ({
            ...u,
            createdAt: u.createdAt.toISOString(),
            balanceExpiresAt: u.balanceExpiresAt?.toISOString() ?? null,
          }))}
          resellers={[]}
          viewerRole={session.role}
        />
      </main>
    </div>
  )
}
