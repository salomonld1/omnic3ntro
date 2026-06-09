import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const USER_SELECT = {
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
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (session.role === 'admin') {
    const users = await prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(users)
  }

  if (session.role === 'reseller') {
    const users = await prisma.user.findMany({
      where: { parentId: session.userId },
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(users)
  }

  return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (session.role !== 'admin' && session.role !== 'reseller') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const { name, email, password, role, parentId } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Nombre, email y contraseña son requeridos' }, { status: 400 })
  }

  // Resellers can only create 'user' role clients under themselves
  if (session.role === 'reseller') {
    if (role && role !== 'user') {
      return NextResponse.json({ error: 'Solo puedes crear clientes de tipo usuario' }, { status: 403 })
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
  }

  // Determine parentId: resellers always own their users; admin can assign
  let assignedParentId: string | null = null
  if (session.role === 'reseller') {
    assignedParentId = session.userId
  } else if (session.role === 'admin' && parentId) {
    assignedParentId = parentId
  }

  const newRole = session.role === 'reseller' ? 'user' : (role ?? 'user')

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: newRole,
      parentId: assignedParentId,
    },
    select: { id: true, name: true, email: true, role: true, parentId: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
