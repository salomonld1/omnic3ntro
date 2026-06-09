import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type ImportRow = { name: string; phone: string; email?: string; country?: string }

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { contacts }: { contacts: ImportRow[] } = await req.json()
  if (!contacts?.length) return NextResponse.json({ error: 'Sin contactos' }, { status: 400 })

  // Get existing phones to skip duplicates
  const existing = await prisma.contact.findMany({
    where: { userId: session.userId },
    select: { phone: true },
  })
  const existingPhones = new Set(existing.map((c) => c.phone))

  const toCreate = contacts.filter((c) => c.phone && !existingPhones.has(c.phone))

  if (toCreate.length === 0) {
    return NextResponse.json({ created: 0, skipped: contacts.length })
  }

  await prisma.contact.createMany({
    data: toCreate.map((c) => ({
      name: c.name,
      phone: c.phone,
      email: c.email || null,
      country: c.country || null,
      userId: session.userId,
    })),
  })

  return NextResponse.json({ created: toCreate.length, skipped: contacts.length - toCreate.length })
}
