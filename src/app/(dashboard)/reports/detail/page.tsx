import { Header } from '@/components/layout/header'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ReportDetailClient } from './_client'

export default async function ReportDetailPage() {
  const session = await getSession()

  const resellers = session?.role === 'admin'
    ? await prisma.user.findMany({ where: { role: 'reseller' }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
    : []

  const clients = session?.role === 'reseller'
    ? await prisma.user.findMany({ where: { parentId: session.userId }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
    : session?.role === 'admin'
    ? await prisma.user.findMany({ where: { role: 'user' }, select: { id: true, name: true }, orderBy: { name: 'asc' } })
    : []

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Reporte Detalle" />
      <main className="flex-1 p-6">
        <ReportDetailClient viewerRole={session?.role ?? 'user'} resellers={resellers} clients={clients} />
      </main>
    </div>
  )
}
