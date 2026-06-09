'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function NewTemplateForm() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', channel: 'sms', content: '', language: 'es' })
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('saving')
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error('Error al crear plantilla')
      router.push('/templates')
    } catch (err: unknown) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre <span className="text-rose-500">*</span></label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="ej: bienvenida_nuevo_cliente" required
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Canal <span className="text-rose-500">*</span></label>
          <select value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent">
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="rcs">RCS</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Idioma</label>
          <select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent">
            <option value="es">Español</option>
            <option value="en">Inglés</option>
            <option value="pt">Portugués</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Contenido <span className="text-rose-500">*</span></label>
        <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required rows={5}
          placeholder={'Hola {{nombre}}, bienvenido a {{empresa}}. Tu código es {{codigo}}.'}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none" />
        <p className="text-xs text-slate-400 mt-1">Usa {'{{variable}}'} para variables dinámicas.</p>
      </div>
      {status === 'error' && <div className="bg-rose-50 text-rose-600 text-sm px-3.5 py-2.5 rounded-lg border border-rose-200">{error}</div>}
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={status === 'saving'}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-medium text-sm rounded-lg transition-colors">
          <Save className="w-4 h-4" />
          {status === 'saving' ? 'Guardando...' : 'Crear plantilla'}
        </button>
        <Link href="/templates" className="px-5 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
          Cancelar
        </Link>
      </div>
    </form>
  )
}
