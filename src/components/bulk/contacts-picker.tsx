'use client'

import { useState, useEffect } from 'react'
import { Search, CheckSquare, Square, Users } from 'lucide-react'

type Contact = {
  id: string
  name: string
  phone: string
}

export type PickedContact = { telefono: string; nombre: string }

export function ContactsPicker({
  accentClass,
  onChange,
}: {
  accentClass: string
  onChange: (contacts: PickedContact[]) => void
}) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch('/api/contacts')
      .then((r) => r.json())
      .then((data) => { setContacts(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = contacts.filter(
    (c) =>
      !filter ||
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.phone.includes(filter)
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      const picked = contacts
        .filter((c) => next.has(c.id))
        .map((c) => ({ telefono: c.phone, nombre: c.name }))
      onChange(picked)
      return next
    })
  }

  function toggleAll() {
    const allIds = filtered.map((c) => c.id)
    const allSelected = allIds.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      allIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)))
      const picked = contacts
        .filter((c) => next.has(c.id))
        .map((c) => ({ telefono: c.phone, nombre: c.name }))
      onChange(picked)
      return next
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400 text-sm gap-2">
        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
        Cargando contactos...
      </div>
    )
  }

  if (contacts.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm">
        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
        No tienes contactos guardados.{' '}
        <a href="/contacts" className="text-sky-600 hover:underline">Agregar contactos</a>
      </div>
    )
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id))

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="search"
          placeholder="Buscar contacto..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>

      <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
        {/* Select all row */}
        <div
          onClick={toggleAll}
          className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
        >
          {allFilteredSelected
            ? <CheckSquare className={`w-4 h-4 ${accentClass}`} />
            : <Square className="w-4 h-4 text-slate-400" />}
          <span className="text-xs font-semibold text-slate-600">
            {allFilteredSelected ? 'Deseleccionar todos' : `Seleccionar todos (${filtered.length})`}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-6 text-center text-slate-400 text-sm">Sin resultados</div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => toggle(c.id)}
              className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${
                selected.has(c.id) ? 'bg-sky-50' : 'hover:bg-slate-50'
              }`}
            >
              {selected.has(c.id)
                ? <CheckSquare className={`w-4 h-4 flex-shrink-0 ${accentClass}`} />
                : <Square className="w-4 h-4 flex-shrink-0 text-slate-300" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{c.name}</p>
                <p className="text-xs text-slate-400 font-mono">{c.phone}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-slate-400">
        {selected.size} seleccionado{selected.size !== 1 ? 's' : ''} de {contacts.length} contactos
      </p>
    </div>
  )
}
