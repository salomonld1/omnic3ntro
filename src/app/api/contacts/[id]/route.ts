import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const contact = await prisma.contact.findUnique({ where: { id } })
  if (!contact || contact.userId !== session.userId) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const { name, phone, email, country, tags } = await req.json()
  if (!name || !phone) return NextResponse.json({ error: 'name y phone son requeridos' }, { status: 400 })

  const updated = await prisma.contact.update({
    where: { id },
    data: { name, phone, email: email || null, country: country || null, tags: tags || null },
  })
  return NextResponse.json(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const contact = await prisma.contact.findUnique({ where: { id } })
  if (!contact || contact.userId !== session.userId) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  await prisma.contact.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
