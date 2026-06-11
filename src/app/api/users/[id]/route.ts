import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
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

async function canManage(session: { userId: string; role: string }, targetId: string) {
  if (session.role === 'admin') return true
  if (session.role === 'reseller' || session.role === 'client') {
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
      pricing: true,
      billingType: true,
      balance: true,
      balanceExpiresAt: true,
      creditLimit: true,
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
  const { name, email, password, role, infobipApiKey, infobipBaseUrl, generateApiKey, parentId, pricing } = body

  if (email && email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({ where: { email } })
    if (emailTaken) return NextResponse.json({ error: 'Ese email ya está en uso' }, { status: 409 })
  }

  if (pricing !== undefined && pricing !== null) {
    if (!isValidPricing(pricing)) {
      return NextResponse.json({ error: 'Estructura de tarifas inválida. Los valores deben ser números positivos.' }, { status: 400 })
    }
  }

  const data: Record<string, unknown> = {}
  if (name) data.name = name
  if (email) data.email = email
  if (password) data.password = await bcrypt.hash(password, 10)
  if (session.role === 'superadmin') {
    if (role !== undefined) {
      const allowed = ['superadmin', 'admin', 'reseller', 'account', 'client', 'user']
      data.role = allowed.includes(role) ? role : 'user'
    }
    if (parentId !== undefined) data.parentId = parentId || null
  } else if (session.role === 'admin') {
    if (role !== undefined) {
      const allowed = ['reseller', 'account', 'client', 'user']
      data.role = allowed.includes(role) ? role : 'user'
    }
    if (parentId !== undefined) data.parentId = parentId || null
  }
  if (infobipApiKey !== undefined) data.infobipApiKey = infobipApiKey || null
  if (infobipBaseUrl !== undefined) data.infobipBaseUrl = infobipBaseUrl || null
  if (pricing !== undefined) data.pricing = pricing || null
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
