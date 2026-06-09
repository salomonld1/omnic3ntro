import { Header } from '@/components/layout/header'
import { getSession } from '@/lib/auth'
import { ConsumoChart } from './_chart'

export default async function ConsumoPage() {
  const session = await getSession()
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Gráfico de consumo" />
      <main className="flex-1 p-6">
        <ConsumoChart role={session?.role ?? 'user'} />
      </main>
    </div>
  )
}
