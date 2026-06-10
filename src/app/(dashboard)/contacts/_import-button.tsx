'use client'

import { useState, useRef } from 'react'
import { Upload, X, AlertCircle, CheckCircle, FileText, Tag } from 'lucide-react'
import { parseContactsFile } from '@/lib/parse-contacts'

type Status = 'idle' | 'preview' | 'importing' | 'done' | 'error'

export function ImportContactsButton({
  onImported,
  existingTags = [],
}: {
  onImported: () => void
  existingTags?: string[]
}) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [fileName, setFileName] = useState('')
  const [preview, setPreview] = useState<{ telefono: string; nombre?: string; email?: string }[]>([])
  const [total, setTotal] = useState(0)
  const [result, setResult] = useState({ created: 0, skipped: 0 })
  const [error, setError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [selectedTag, setSelectedTag] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const allContactsRef = useRef<{ telefono: string; nombre?: string; email?: string; pais?: string }[]>([])

  function reset() {
    setStatus('idle')
    setFileName('')
    setPreview([])
    setTotal(0)
    setError('')
    setTagInput('')
    setSelectedTag('')
    allContactsRef.current = []
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setError('')
    setFileName(file.name)
    try {
      const rows = await parseContactsFile(file)
      allContactsRef.current = rows
      setTotal(rows.length)
      setPreview(rows.slice(0, 5))
      setStatus('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al leer el archivo')
      setStatus('error')
    }
  }

  const effectiveTag = tagInput.trim() || selectedTag

  async function handleImport() {
    setStatus('importing')
    try {
      const res = await fetch('/api/contacts/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: allContactsRef.current.map((c) => ({
            name: c.nombre || c.telefono,
            phone: c.telefono,
            email: c.email,
            country: c.pais,
          })),
          tags: effectiveTag || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      setResult({ created: data.created, skipped: data.skipped })
      setStatus('done')
      onImported()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
      setStatus('error')
    }
  }

  function close() {
    setOpen(false)
    setTimeout(reset, 300)
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg border border-slate-200 transition-colors"
      >
        <Upload className="w-4 h-4" /> Importar CSV / Excel
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={close} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800">Importar contactos</h2>
              <button onClick={close} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {status === 'idle' && (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-sky-400 rounded-xl p-10 text-center cursor-pointer transition-colors"
                >
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-600">Haz clic para subir CSV o Excel</p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Columnas: <strong>telefono</strong> (requerido), nombre, email, pais
                  </p>
                  <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} className="hidden" />
                </div>
              )}

              {(status === 'preview' || status === 'importing') && (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 bg-sky-50 border border-sky-200 rounded-lg">
                    <FileText className="w-5 h-5 text-sky-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-sky-800 truncate">{fileName}</p>
                      <p className="text-xs text-sky-600">{total} contactos detectados</p>
                    </div>
                    <button onClick={reset} className="p-1 hover:bg-sky-100 rounded transition-colors" disabled={status === 'importing'}>
                      <X className="w-4 h-4 text-sky-600" />
                    </button>
                  </div>

                  {/* Tag assignment */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Tag className="w-4 h-4 text-slate-400" /> Asignar etiqueta (opcional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => { setTagInput(e.target.value); setSelectedTag('') }}
                        placeholder="Escribe una etiqueta nueva..."
                        disabled={status === 'importing'}
                        className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent disabled:opacity-50"
                      />
                      {existingTags.length > 0 && (
                        <select
                          value={selectedTag}
                          onChange={(e) => { setSelectedTag(e.target.value); setTagInput('') }}
                          disabled={status === 'importing'}
                          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white disabled:opacity-50"
                        >
                          <option value="">Etiquetas existentes</option>
                          {existingTags.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      )}
                    </div>
                    {effectiveTag && (
                      <p className="text-xs text-sky-600">
                        Se asignará la etiqueta <strong>"{effectiveTag}"</strong> a todos los contactos importados
                      </p>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Vista previa</p>
                      <p className="text-xs text-slate-400">primeros {preview.length} de {total}</p>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left px-4 py-2 text-slate-500 font-medium">Teléfono</th>
                          <th className="text-left px-4 py-2 text-slate-500 font-medium">Nombre</th>
                          <th className="text-left px-4 py-2 text-slate-500 font-medium">Email</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {preview.map((c, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2 font-mono text-slate-700">{c.telefono}</td>
                            <td className="px-4 py-2 text-slate-500">{c.nombre || '—'}</td>
                            <td className="px-4 py-2 text-slate-500">{c.email || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {status === 'done' && (
                <div className="text-center py-6">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <p className="font-semibold text-slate-800">Importación completada</p>
                  <p className="text-sm text-slate-500 mt-1">
                    <strong className="text-emerald-600">{result.created}</strong> contactos nuevos
                    {result.skipped > 0 && <> · <strong className="text-slate-400">{result.skipped}</strong> duplicados omitidos</>}
                  </p>
                </div>
              )}

              {status === 'error' && (
                <div className="flex items-start gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              {status === 'done' || status === 'error' ? (
                <button onClick={close} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors">
                  Cerrar
                </button>
              ) : (
                <>
                  <button onClick={close} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
                    Cancelar
                  </button>
                  {status === 'preview' && (
                    <button onClick={handleImport}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors">
                      Importar {total} contactos
                    </button>
                  )}
                  {status === 'importing' && (
                    <button disabled className="px-4 py-2 bg-sky-400 text-white text-sm font-medium rounded-lg opacity-70">
                      Importando...
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
