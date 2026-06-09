import { NextResponse } from 'next/server'
import { seedAdmin } from '@/app/actions/auth'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }
  await seedAdmin()
  return NextResponse.json({ success: true, message: 'Admin creado: admin@omnic3ntro.com / admin123' })
}
