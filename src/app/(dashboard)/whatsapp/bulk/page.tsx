import { Header } from '@/components/layout/header'
import { BulkWhatsAppForm } from './_form'

export default function WhatsAppBulkPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="WhatsApp — Envío masivo" />
      <main className="flex-1 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <BulkWhatsAppForm />
          </div>
        </div>
      </main>
    </div>
  )
}
