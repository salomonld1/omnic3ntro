import { Header } from '@/components/layout/header'
import { ArrowLeft, Upload } from 'lucide-react'
import Link from 'next/link'
import { BulkSmsForm } from './_form'

export default function BulkSmsPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Envío Masivo SMS" />
      <main className="flex-1 p-6 max-w-2xl">
        <Link href="/sms" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Volver a SMS
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Upload className="w-5 h-5 text-sky-600" />
            <h2 className="font-semibold text-slate-800">Nueva campaña SMS masivo</h2>
          </div>
          <BulkSmsForm />
        </div>
      </main>
    </div>
  )
}
