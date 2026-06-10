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
  parent: { select: { id: true, name: true, parentId: true } },
  _count: { select: { messages: true, campaigns: true, children: true } },
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (session.role === 'admin') {
    const users = await prisma.user.findMany({
      where: {
        role: { not: 'admin' },
        NOT: { role: 'user', parent: { parentId: { not: null } } },
      },
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(users)
  }

  if (session.role === 'reseller' || session.role === 'client') {
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

  if (!['admin', 'reseller', 'client'].includes(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const { name, email, password, role, parentId, infobipAppId } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Nombre, email y contraseña son requeridos' }, { status: 400 })
  }

  // Resellers create clients; clients create users
  if (session.role === 'reseller' && role && role !== 'client') {
    return NextResponse.json({ error: 'Solo puedes crear clientes' }, { status: 403 })
  }
  if (session.role === 'client' && role && role !== 'user') {
    return NextResponse.json({ error: 'Solo puedes crear usuarios' }, { status: 403 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
  }

  // Un usuario (role='user') siempre debe tener un cliente padre
  const resolvedRole = session.role === 'reseller' ? 'client' : session.role === 'client' ? 'user' : (role ?? 'user')
  if (resolvedRole === 'user' && session.role === 'admin' && !parentId) {
    return NextResponse.json({ error: 'Un usuario debe estar asignado a un cliente' }, { status: 400 })
  }

  let assignedParentId: string | null = null
  if (session.role === 'reseller') {
    assignedParentId = session.userId
  } else if (session.role === 'client') {
    assignedParentId = session.userId
  } else if (session.role === 'admin' && parentId) {
    assignedParentId = parentId
  }

  const newRole = resolvedRole

  // Auto-generate unique 5-digit ID for clients and resellers
  let resolvedAppId = infobipAppId || null
  if (!resolvedAppId && (newRole === 'client' || newRole === 'reseller')) {
    let candidate: string
    let attempts = 0
    do {
      candidate = String(Math.floor(10000 + Math.random() * 90000))
      const exists = await prisma.user.findFirst({ where: { infobipAppId: candidate } })
      if (!exists) { resolvedAppId = candidate; break }
      attempts++
    } while (attempts < 20)
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await bcrypt.hash(password, 10),
      role: newRole,
      parentId: assignedParentId,
      ...(resolvedAppId ? { infobipAppId: resolvedAppId } : {}),
    },
    select: { id: true, name: true, email: true, role: true, parentId: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
