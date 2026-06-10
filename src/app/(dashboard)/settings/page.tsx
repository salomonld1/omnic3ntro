import { Header } from '@/components/layout/header'
import { SettingsForm } from './_form'
import { getSession } from '@/lib/auth'

export default async function SettingsPage() {
  const session = await getSession()
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Configuración" />
      <main className="flex-1 p-6 max-w-2xl">
        <SettingsForm role={session?.role ?? 'user'} />
      </main>
    </div>
  )
}
