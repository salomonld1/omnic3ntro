import { Header } from '@/components/layout/header'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { SendWhatsAppForm } from './_form'

export default function SendWhatsAppPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Enviar WhatsApp" />
      <main className="flex-1 p-6 max-w-2xl">
        <Link href="/whatsapp" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Volver a WhatsApp
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-5">Nuevo mensaje WhatsApp</h2>
          <SendWhatsAppForm />
        </div>
      </main>
    </div>
  )
}
