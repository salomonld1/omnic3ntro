import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'fallback-secret-change-in-production'
)

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()

  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  if (session.impersonatedBy) {
    return NextResponse.json({ error: 'Ya estás en modo impersonación' }, { status: 400 })
  }

  const { id } = await params
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true },
  })

  if (!target) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
  if (target.role === 'admin') {
    return NextResponse.json({ error: 'No puedes entrar como otro administrador' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const adminToken = cookieStore.get('session')?.value!

  const impersonToken = await new SignJWT({
    userId: target.id,
    email: target.email,
    name: target.name,
    role: target.role,
    impersonatedBy: { userId: session.userId, name: session.name, email: session.email },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('2h')
    .sign(SECRET)

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  }

  cookieStore.set('session', impersonToken, { ...cookieOpts, maxAge: 60 * 60 * 2 })
  cookieStore.set('admin_session', adminToken, { ...cookieOpts, maxAge: 60 * 60 * 8 })

  return NextResponse.json({ success: true })
}
