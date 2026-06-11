import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const PRICING_CHANNELS: Record<string, string[]> = {
  sms: ['marketing', 'transaccional'],
  whatsapp: ['marketing', 'otp', 'notificacion'],
  rcs: ['simple', 'basic', 'conversacional'],
}

function isValidPricing(raw: unknown): boolean {
  let parsed: unknown
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
  } catch { return false }
  if (typeof parsed !== 'object' || !parsed) return false
  const p = parsed as Record<string, unknown>
  for (const [ch, cats] of Object.entries(PRICING_CHANNELS)) {
    if (p[ch] === undefined) continue
    if (typeof p[ch] !== 'object' || !p[ch]) return false
    const chObj = p[ch] as Record<string, unknown>
    for (const cat of cats) {
      if (chObj[cat] === undefined) continue
      const v = chObj[cat]
      if (typeof v !== 'number' || v < 0 || !isFinite(v)) return false
    }
  }
  return true
}

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  parentId: true,
  apiKey: true,
  infobipBaseUrl: true,
  billingType: true,
  balance: true,
  creditLimit: true,
  createdAt: true,
  parent: { select: { id: true, name: true, parentId: true } },
  _count: { select: { messages: true, campaigns: true, children: true } },
}

const ADMIN_ROLES = ['admin', 'superadmin']

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  if (ADMIN_ROLES.includes(session.role)) {
    const users = await prisma.user.findMany({
      where: {
        role: { notIn: ['admin', 'superadmin'] },
        NOT: { role: 'user', parent: { parentId: { not: null } } },
      },
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(users)
  }

  if (session.role === 'reseller' || session.role === 'account' || session.role === 'client') {
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

  const isAdmin    = ADMIN_ROLES.includes(session.role)
  const isReseller = session.role === 'reseller'
  if (!isAdmin && !['reseller', 'account', 'client'].includes(session.role)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await request.json()
  const { name, email, password, role, parentId, billingType, pricing, balanceManager } = body

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Nombre, email y contraseña son requeridos' }, { status: 400 })
  }

  if (session.role === 'reseller' && role && !['account', 'client', 'user'].includes(role)) {
    return NextResponse.json({ error: 'Solo puedes crear clientes o usuarios' }, { status: 403 })
  }
  if ((session.role === 'account' || session.role === 'client') && role && role !== 'user') {
    return NextResponse.json({ error: 'Solo puedes crear usuarios' }, { status: 403 })
  }
  if ((role === 'admin' || role === 'superadmin') && session.role !== 'superadmin') {
    return NextResponse.json({ error: 'No autorizado para crear administradores' }, { status: 403 })
  }

  if (pricing !== undefined && pricing !== null) {
    if (!isValidPricing(pricing)) {
      return NextResponse.json({ error: 'Estructura de tarifas inválida. Los valores deben ser números positivos.' }, { status: 400 })
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Ya existe un usuario con ese email' }, { status: 409 })
  }

  const resolvedRole =
    session.role === 'reseller'                             ? (role === 'user' ? 'user' : 'account') :
    session.role === 'account' || session.role === 'client' ? 'user' :
    (role ?? 'user')

  if (resolvedRole === 'user' && isAdmin && !parentId) {
    return NextResponse.json({ error: 'Un usuario debe estar asignado a una cuenta' }, { status: 400 })
  }

  let assignedParentId: string | null = null
  if (session.role === 'reseller' || session.role === 'account' || session.role === 'client') {
    assignedParentId = session.userId
  } else if (isAdmin && parentId) {
    assignedParentId = parentId
  }

  const data: Record<string, unknown> = {
    name, email,
    password: await bcrypt.hash(password, 10),
    role: resolvedRole,
    parentId: assignedParentId,
  }

  // billing type when creating an account (admin or reseller) or reseller (admin only)
  if ((isAdmin || isReseller) && resolvedRole === 'account') {
    if (billingType) data.billingType = billingType
    if (billingType === 'prepaid' || billingType === 'postpaid') data.balance = 0
  }
  if (isAdmin && resolvedRole === 'reseller') {
    if (billingType) data.billingType = billingType
    if (billingType === 'prepaid' || billingType === 'postpaid') data.balance = 0
    if (balanceManager) data.balanceManager = balanceManager
  }
  if ((isAdmin || isReseller) && resolvedRole === 'account' && pricing) {
    data.pricing = pricing
  }

  const user = await prisma.user.create({
    data: data as Parameters<typeof prisma.user.create>[0]['data'],
    select: { id: true, name: true, email: true, role: true, parentId: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
