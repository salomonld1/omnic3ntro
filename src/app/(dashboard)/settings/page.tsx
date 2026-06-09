import { Header } from '@/components/layout/header'
import { SettingsForm } from './_form'

export default function SettingsPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Configuración" />
      <main className="flex-1 p-6 max-w-2xl">
        <SettingsForm />
      </main>
    </div>
  )
}
