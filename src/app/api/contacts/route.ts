import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const contacts = await prisma.contact.findMany({
    where: { userId: session.userId },
    select: { id: true, name: true, phone: true, email: true, country: true, tags: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(contacts)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, phone, email, country, tags } = await req.json()
  if (!name || !phone) return NextResponse.json({ error: 'name y phone son requeridos' }, { status: 400 })

  const contact = await prisma.contact.create({
    data: { name, phone, email: email || null, country: country || null, tags: tags || null, userId: session.userId },
  })
  return NextResponse.json(contact, { status: 201 })
}
