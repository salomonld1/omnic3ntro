import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, email, password } = await req.json()
  const data: Record<string, string> = {}
  if (name) data.name = name
  if (email) data.email = email
  if (password) data.password = await bcrypt.hash(password, 10)

  await prisma.user.update({ where: { id: session.userId }, data })
  return NextResponse.json({ success: true })
}
