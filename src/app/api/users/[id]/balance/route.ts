import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function canManage(session: { userId: string; role: string }, targetId: string) {
  if (session.role === 'superadmin' || session.role === 'admin') {
    // admin can manage direct clients and reseller-clients unless balanceManager restricts it
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { parentId: true, parent: { select: { balanceManager: true } } },
    })
    const bm = target?.parent?.balanceManager
    if (bm === 'reseller') return false // reseller-exclusive
    return true
  }
  if (session.role === 'reseller') {
    const target = await prisma.user.findUnique({
      where: { id: targetId },
      select: { parentId: true },
    })
    if (target?.parentId !== session.userId) return false
    // check if this reseller is allowed to manage balance
    const self = await prisma.user.findUnique({ where: { id: session.userId }, select: { balanceManager: true } })
    const bm = self?.balanceManager
    if (bm === 'admin') return false // admin-exclusive
    return true
  }
  return false
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  if (!(await canManage(session, id))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, billingType: true } })
  if (!user) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

  const body = await request.json()
  const { type, amount, expiresAt, creditLimit, billingType } = body

  // Change billing type
  if (billingType !== undefined) {
    await prisma.user.update({
      where: { id },
      data: {
        billingType: billingType || null,
        balance: billingType ? 0 : null,
        balanceExpiresAt: null,
        creditLimit: null,
      },
    })
    return NextResponse.json({ success: true })
  }

  // Add prepaid balance (topup)
  if (type === 'topup') {
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return NextResponse.json({ error: 'Monto inválido' }, { status: 400 })
    const expiry = expiresAt ? new Date(expiresAt) : null

    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          balance: { increment: amt },
          ...(expiry ? { balanceExpiresAt: expiry } : {}),
        },
      }),
      prisma.balanceTransaction.create({
        data: { userId: id, amount: amt, type: 'topup', expiresAt: expiry, createdById: session.userId },
      }),
    ])
    return NextResponse.json({ success: true })
  }

  // Set postpaid credit limit
  if (type === 'set_limit') {
    const limit = parseFloat(creditLimit)
    if (isNaN(limit) || limit < 0) return NextResponse.json({ error: 'Límite inválido' }, { status: 400 })
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { creditLimit: limit } }),
      prisma.balanceTransaction.create({
        data: { userId: id, amount: limit, type: 'limit_set', note: `Límite: $${limit}`, createdById: session.userId },
      }),
    ])
    return NextResponse.json({ success: true })
  }

  // Reset postpaid debt (invoice paid)
  if (type === 'reset_debt') {
    const prev = await prisma.user.findUnique({ where: { id }, select: { balance: true } })
    await prisma.$transaction([
      prisma.user.update({ where: { id }, data: { balance: 0 } }),
      prisma.balanceTransaction.create({
        data: { userId: id, amount: prev?.balance ?? 0, type: 'debt_reset', note: 'Deuda saldada', createdById: session.userId },
      }),
    ])
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Tipo de operación inválido' }, { status: 400 })
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  if (!(await canManage(session, id))) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const transactions = await prisma.balanceTransaction.findMany({
    where: { userId: id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })
  return NextResponse.json(transactions)
}
