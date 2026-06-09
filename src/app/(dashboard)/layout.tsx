import { Sidebar } from '@/components/layout/sidebar'
import { ImpersonationBanner } from '@/components/layout/impersonation-banner'
import { getSession } from '@/lib/auth'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  return (
    <div className="flex h-full">
      <Sidebar role={session?.role ?? 'user'} />
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
  )
}
