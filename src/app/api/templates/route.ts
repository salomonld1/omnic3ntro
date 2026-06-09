import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const templates = await prisma.template.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { name, channel, content, language } = await req.json()
  if (!name || !channel || !content) {
    return NextResponse.json({ error: 'name, channel y content son requeridos' }, { status: 400 })
  }

  const template = await prisma.template.create({
    data: { name, channel, content, language: language || 'es', userId: session.userId },
  })
  return NextResponse.json(template, { status: 201 })
}
