'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { createSession, deleteSession } from '@/lib/auth'

export async function login(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email y contraseña son requeridos' }
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return { error: 'Credenciales incorrectas' }
  }

  await createSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })

  redirect('/dashboard')
}

export async function logout() {
  await deleteSession()
  redirect('/login')
}

export async function seedAdmin() {
  const existing = await prisma.user.findUnique({
    where: { email: 'admin@omnic3ntro.com' },
  })
  if (existing) return

  await prisma.user.create({
    data: {
      name: 'Administrador',
      email: 'admin@omnic3ntro.com',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
    },
  })
}
