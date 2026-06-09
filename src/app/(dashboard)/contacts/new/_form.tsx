'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function NewContactForm() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', phone: '', email: '', country: '', tags: '' })
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Error al crear contacto')
      router.push('/contacts')
    } catch (err: unknown) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  const fields = [
    { id: 'name', label: 'Nombre completo', type: 'text', placeholder: 'Juan García', required: true },
    { id: 'phone', label: 'Teléfono', type: 'tel', placeholder: '+52 55 1234 5678', required: true },
    { id: 'email', label: 'Email', type: 'email', placeholder: 'juan@empresa.com', required: false },
    { id: 'country', label: 'País', type: 'text', placeholder: 'México', required: false },
    { id: 'tags', label: 'Etiquetas', type: 'text', placeholder: 'vip, cliente, promo', required: false },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map(({ id, label, type, placeholder, required }) => (
        <div key={id}>
          <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          <input id={id} type={type} value={form[id as keyof typeof form]}
            onChange={(e) => setForm({ ...form, [id]: e.target.value })}
            placeholder={placeholder} required={required}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
        </div>
      ))}
      {status === 'error' && <div className="bg-rose-50 text-rose-600 text-sm px-3.5 py-2.5 rounded-lg border border-rose-200">{error}</div>}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={status === 'saving'}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-medium text-sm rounded-lg transition-colors">
          <UserPlus className="w-4 h-4" />
          {status === 'saving' ? 'Guardando...' : 'Crear contacto'}
        </button>
        <Link href="/contacts" className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  )
}
