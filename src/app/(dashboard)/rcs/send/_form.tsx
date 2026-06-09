'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

export function SendRcsForm() {
  const [form, setForm] = useState({ to: '', from: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [result, setResult] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/rcs/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al enviar')
      setStatus('success')
      setResult(data.messageId ?? 'Enviado correctamente')
      setForm({ to: '', from: '', message: '' })
    } catch (err: unknown) {
      setStatus('error')
      setResult(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Sender RCS <span className="text-rose-500">*</span></label>
        <input type="text" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}
          placeholder="ID del sender RCS" required
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Destinatario <span className="text-rose-500">*</span></label>
        <input type="tel" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}
          placeholder="+52 55 1234 5678" required
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Mensaje <span className="text-rose-500">*</span></label>
        <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Escribe tu mensaje enriquecido..." required rows={4}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none" />
      </div>
      {status === 'success' && <div className="bg-emerald-50 text-emerald-700 text-sm px-3.5 py-2.5 rounded-lg border border-emerald-200">✓ {result}</div>}
      {status === 'error' && <div className="bg-rose-50 text-rose-600 text-sm px-3.5 py-2.5 rounded-lg border border-rose-200">{result}</div>}
      <button type="submit" disabled={status === 'sending'}
        className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-medium text-sm rounded-lg transition-colors">
        <Send className="w-4 h-4" />
        {status === 'sending' ? 'Enviando...' : 'Enviar mensaje RCS'}
      </button>
    </form>
  )
}
