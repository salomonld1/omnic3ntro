import { Header } from '@/components/layout/header'
import { BulkRcsForm } from './_form'

export default function RcsBulkPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="RCS — Envío masivo" />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <BulkRcsForm />
          </div>
        </div>
      </main>
    </div>
  )
}
