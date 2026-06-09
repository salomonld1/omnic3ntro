'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'

export function SendSmsForm() {
  const [form, setForm] = useState({ to: '', from: '', message: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [result, setResult] = useState('')

  const charCount = form.message.length
  const parts = Math.ceil(charCount / 160) || 1

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch('/api/sms/send', {
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
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Destinatario <span className="text-rose-500">*</span>
        </label>
        <input type="tel" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })}
          placeholder="+52 55 1234 5678" required
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Remitente</label>
        <input type="text" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}
          placeholder="Omnic3ntro (opcional)" maxLength={11}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Mensaje <span className="text-rose-500">*</span>
        </label>
        <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Escribe tu mensaje aquí..." required rows={4}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none" />
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-slate-400">{charCount} caracteres · {parts} parte{parts > 1 ? 's' : ''}</span>
          <span className={`text-xs ${charCount > 160 ? 'text-amber-500' : 'text-slate-400'}`}>
            {160 - (charCount % 160 || 160)} restantes en parte actual
          </span>
        </div>
      </div>
      {status === 'success' && (
        <div className="bg-emerald-50 text-emerald-700 text-sm px-3.5 py-2.5 rounded-lg border border-emerald-200">
          ✓ Mensaje enviado. ID: {result}
        </div>
      )}
      {status === 'error' && (
        <div className="bg-rose-50 text-rose-600 text-sm px-3.5 py-2.5 rounded-lg border border-rose-200">{result}</div>
      )}
      <button type="submit" disabled={status === 'sending'}
        className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-medium text-sm rounded-lg transition-colors">
        <Send className="w-4 h-4" />
        {status === 'sending' ? 'Enviando...' : 'Enviar SMS'}
      </button>
    </form>
  )
}
