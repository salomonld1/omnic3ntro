import { cookies } from 'next/headers'
import { Sidebar } from '@/components/layout/sidebar'
import { ImpersonationBanner } from '@/components/layout/impersonation-banner'
import { DevRoleSelector } from '@/components/layout/dev-role-selector'
import { getSession } from '@/lib/auth'

const DEV_ROLES = ['superadmin', 'admin', 'reseller', 'account', 'user']

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const cookieStore = await cookies()
  const devRoleCookie = cookieStore.get('dev_role')?.value
  const isDev = process.env.NODE_ENV === 'development'
  const canUseDevRole = isDev && (session?.role === 'admin' || session?.role === 'superadmin')
  const devRole = canUseDevRole && devRoleCookie && DEV_ROLES.includes(devRoleCookie) ? devRoleCookie : null
  const effectiveRole = devRole ?? session?.role ?? 'user'

  return (
    <div className="flex flex-col h-full">
      {canUseDevRole && <DevRoleSelector current={effectiveRole} />}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar role={effectiveRole} />
        <div className="flex-1 flex flex-col overflow-hidden">
          {session?.impersonatedBy && (
            <ImpersonationBanner
              adminName={session.impersonatedBy.name}
              userName={session.name}
            />
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
