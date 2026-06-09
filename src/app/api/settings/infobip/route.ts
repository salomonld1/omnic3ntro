import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { apiKey, baseUrl } = await req.json()
  await prisma.user.update({
    where: { id: session.userId },
    data: { infobipApiKey: apiKey, infobipBaseUrl: baseUrl },
  })
  return NextResponse.json({ success: true })
}
