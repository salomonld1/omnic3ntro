import { cookies } from 'next/headers'

const DEV_ROLES = ['superadmin', 'admin', 'reseller', 'account', 'user']

export async function getEffectiveRole(sessionRole: string): Promise<string> {
  if (process.env.NODE_ENV !== 'development') return sessionRole
  // Only admin/superadmin can simulate roles — prevents privilege escalation if NODE_ENV leaks
  if (!['admin', 'superadmin'].includes(sessionRole)) return sessionRole
  const cookieStore = await cookies()
  const devRole = cookieStore.get('dev_role')?.value
  if (devRole && DEV_ROLES.includes(devRole)) return devRole
  return sessionRole
}
