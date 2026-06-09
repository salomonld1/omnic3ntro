import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

async function canManage(session: { userId: string; role: string }, targetId: string) {
  if (session.role === 'admin') return true
  if (session.role === 'reseller') {
    const target = await prisma.user.findUnique({ where: { id: targetId }, select: { parentId: true } })
    return target?.parentId === session.userId
  }
  return false
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  if (!(await canManage(session, id))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

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
      createdAt: true,
      parent: { select: { id: true, name: true } },
    },
  })

  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  return NextResponse.json(user)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  if (!(await canManage(session, id))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const body = await request.json()
  const { name, email, password, role, infobipApiKey, infobipBaseUrl, generateApiKey, parentId } = body

  if (email && email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } })
    if (emailTaken) return NextResponse.json({ error: 'Ese email ya está en uso' }, { status: 409 })
  }

  const data: Record<string, unknown> = {}
  if (name) data.name = name
  if (email) data.email = email
  if (password) data.password = await bcrypt.hash(password, 10)
  if (session.role === 'admin') {
    if (role !== undefined) data.role = ['admin', 'reseller', 'user'].includes(role) ? role : 'user'
    if (parentId !== undefined) data.parentId = parentId || null
  }
  if (infobipApiKey !== undefined) data.infobipApiKey = infobipApiKey || null
  if (infobipBaseUrl !== undefined) data.infobipBaseUrl = infobipBaseUrl || null
  if (generateApiKey) data.apiKey = `o3_${crypto.randomBytes(24).toString('hex')}`

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      parentId: true,
      apiKey: true,
      infobipBaseUrl: true,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params

  if (id === session.userId) {
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
  }

  if (!(await canManage(session, id))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  await prisma.user.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
