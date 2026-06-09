import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getSession } from '@/lib/auth'

export async function POST() {
  const session = await getSession()

  if (!session?.impersonatedBy) {
    return NextResponse.json({ error: 'No estás en modo impersonación' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const adminToken = cookieStore.get('admin_session')?.value

  if (!adminToken) {
    return NextResponse.json({ error: 'Sesión de admin no encontrada' }, { status: 400 })
  }

  cookieStore.set('session', adminToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  cookieStore.delete('admin_session')

  return NextResponse.json({ success: true })
}
