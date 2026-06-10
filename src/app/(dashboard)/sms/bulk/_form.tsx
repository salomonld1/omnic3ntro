'use client'

import { useState, useRef } from 'react'
import { FileText, Send, Upload, X, AlertCircle, Download } from 'lucide-react'
import { parseContactsFile, applyTemplate, type ContactRow } from '@/lib/parse-contacts'
import { ContactsPicker, type PickedContact } from '@/components/bulk/contacts-picker'

type Tab = 'archivo' | 'contactos' | 'manual'

export function BulkSmsForm() {
  const [tab, setTab] = useState<Tab>('archivo')
  const [form, setForm] = useState({ name: '', from: '', message: '' })
  const [numbers, setNumbers] = useState('')
  const [fileContacts, setFileContacts] = useState<ContactRow[]>([])
  const [pickedContacts, setPickedContacts] = useState<PickedContact[]>([])
  const [fileError, setFileError] = useState('')
  const [fileName, setFileName] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [result, setResult] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const manualNumbers = numbers.split('\n').map((n) => n.trim()).filter(Boolean)
  const totalContacts =
    tab === 'archivo' ? fileContacts.length :
    tab === 'contactos' ? pickedContacts.length :
    manualNumbers.length

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileError('')
    setFileContacts([])
    setFileName(file.name)
    try {
      const rows = await parseContactsFile(file)
      setFileContacts(rows)
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Error al leer el archivo')
    }
    e.target.value = ''
  }

  function clearFile() {
    setFileContacts([])
    setFileName('')
    setFileError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (totalContacts === 0) return
    setStatus('sending')
    setResult('')

    try {
      let payload: Record<string, unknown>

      if (tab === 'archivo') {
        payload = {
          name: form.name,
          from: form.from,
          message: form.message,
          contacts: fileContacts.map((c) => ({
            to: c.telefono,
            name: c.nombre,
            message: c.mensaje || applyTemplate(form.message, c.nombre),
          })),
        }
      } else if (tab === 'contactos') {
        payload = {
          name: form.name,
          from: form.from,
          message: form.message,
          contacts: pickedContacts.map((c) => ({
            to: c.telefono,
            name: c.nombre,
            message: applyTemplate(form.message, c.nombre),
          })),
        }
      } else {
        payload = {
          name: form.name,
          from: form.from,
          message: form.message,
          numbers: manualNumbers,
        }
      }

      const res = await fetch('/api/sms/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setStatus('success')
      setResult(`Campaña creada: ${data.total} mensajes enviados`)
      setForm({ name: '', from: '', message: '' })
      setNumbers('')
      setFileContacts([])
      setFileName('')
      setPickedContacts([])
    } catch (err: unknown) {
      setStatus('error')
      setResult(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'archivo',   label: '📎 Subir archivo' },
    { id: 'contactos', label: '👥 Desde contactos' },
    { id: 'manual',    label: '✏️ Escribir números' },
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de campaña <span className="text-rose-500">*</span></label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej: Promo julio 2024" required
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Remitente</label>
          <input type="text" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })}
            placeholder="Omnic3ntro" maxLength={11}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Mensaje <span className="text-rose-500">*</span>
          <span className="text-slate-400 font-normal ml-2">— usa <code className="bg-slate-100 px-1 rounded">{'{{nombre}}'}</code> para personalizar</span>
        </label>
        <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="Hola {{nombre}}, tienes una promoción especial..." required rows={3}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none" />
        <p className="text-xs text-slate-400 mt-1">{form.message.length} caracteres · Si el archivo tiene columna "mensaje", ese texto tiene prioridad.</p>
      </div>

      <div>
        <div className="flex border-b border-slate-200 mb-4">
          {TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'archivo' && (
          <div className="space-y-3">
            {!fileName ? (
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-sky-400 rounded-xl p-8 text-center cursor-pointer transition-colors">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">Haz clic para subir CSV o Excel</p>
                <p className="text-xs text-slate-400 mt-1">Columnas: <strong>telefono</strong> (requerido), nombre, mensaje</p>
                <a
                  href="/plantilla-bulk.csv"
                  download="plantilla-bulk.csv"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 mt-2 text-xs text-sky-600 hover:underline"
                >
                  <Download className="w-3.5 h-3.5" /> Descargar plantilla de ejemplo
                </a>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3 bg-sky-50 border border-sky-200 rounded-lg">
                <FileText className="w-5 h-5 text-sky-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sky-800 truncate">{fileName}</p>
                  <p className="text-xs text-sky-600">{fileContacts.length} contactos cargados</p>
                </div>
                <button type="button" onClick={clearFile} className="p-1 hover:bg-sky-100 rounded transition-colors">
                  <X className="w-4 h-4 text-sky-600" />
                </button>
              </div>
            )}
            {fileError && (
              <div className="flex items-start gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{fileError}
              </div>
            )}
            {fileContacts.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vista previa (primeros 5)</p>
                  <p className="text-xs text-slate-400">{fileContacts.length} total</p>
                </div>
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-slate-100">
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Teléfono</th>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Nombre</th>
                    <th className="text-left px-4 py-2 text-slate-500 font-medium">Mensaje</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {fileContacts.slice(0, 5).map((c, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-slate-700">{c.telefono}</td>
                        <td className="px-4 py-2 text-slate-500">{c.nombre ?? '—'}</td>
                        <td className="px-4 py-2 text-slate-500 max-w-xs truncate">
                          {c.mensaje || applyTemplate(form.message, c.nombre) || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'contactos' && (
          <ContactsPicker
            accentClass="text-sky-600"
            onChange={setPickedContacts}
          />
        )}

        {tab === 'manual' && (
          <div>
            <div className="relative">
              <FileText className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <textarea value={numbers} onChange={(e) => setNumbers(e.target.value)}
                placeholder={"+52551234567\n+52559876543\n+52551111111"} rows={6}
                className="w-full pl-9 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent resize-none" />
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Un número por línea · <strong>{manualNumbers.length}</strong> número{manualNumbers.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {status === 'success' && <div className="bg-emerald-50 text-emerald-700 text-sm px-3.5 py-2.5 rounded-lg border border-emerald-200">✓ {result}</div>}
      {status === 'error' && <div className="bg-rose-50 text-rose-600 text-sm px-3.5 py-2.5 rounded-lg border border-rose-200">⚠ {result}</div>}

      <div className="flex items-center justify-between pt-1">
        <p className="text-sm text-slate-500">
          Se enviarán <strong className="text-slate-700">{totalContacts.toLocaleString()}</strong> mensajes
        </p>
        <button type="submit" disabled={status === 'sending' || totalContacts === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white font-medium text-sm rounded-lg transition-colors">
          <Send className="w-4 h-4" />
          {status === 'sending' ? 'Enviando...' : 'Lanzar campaña'}
        </button>
      </div>
    </form>
  )
}
