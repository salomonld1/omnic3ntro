import { Header } from '@/components/layout/header'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { NewContactForm } from './_form'

export default function NewContactPage() {
  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Nuevo Contacto" />
      <main className="flex-1 p-6 max-w-xl">
        <Link href="/contacts" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Volver a Contactos
        </Link>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-5">Crear nuevo contacto</h2>
          <NewContactForm />
        </div>
      </main>
    </div>
  )
}
