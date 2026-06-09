import { Header } from '@/components/layout/header'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ContactList } from './_list'

export default async function ContactsPage() {
  const session = await getSession()
  const contacts = await prisma.contact.findMany({
    where: { userId: session?.userId },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Contactos" />
      <main className="flex-1 p-6">
        <ContactList initialContacts={contacts.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() }))} />
      </main>
    </div>
  )
}
