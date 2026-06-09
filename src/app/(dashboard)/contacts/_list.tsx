'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users, Plus, Phone, Mail, Trash2 } from 'lucide-react'
import { ImportContactsButton } from './_import-button'
import { formatDate } from '@/lib/utils'

type Contact = {
  id: string
  name: string
  phone: string
  email: string | null
  country: string | null
  createdAt: string
}

export function ContactList({ initialContacts }: { initialContacts: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [filter, setFilter] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)

  async function reload() {
    const res = await fetch('/api/contacts')
    if (res.ok) {
      const data = await res.json()
      setContacts(data)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar a "${name}"?`)) return
    setDeleting(id)
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    if (res.ok) setContacts((prev) => prev.filter((c) => c.id !== id))
    setDeleting(null)
  }

  const filtered = contacts.filter(
    (c) =>
      !filter ||
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.phone.includes(filter) ||
      (c.email ?? '').toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <input
          type="search"
          placeholder="Buscar por nombre, teléfono o email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-48 max-w-xs px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
        <span className="text-sm text-slate-500 mr-auto">{filtered.length} contacto{filtered.length !== 1 ? 's' : ''}</span>
        <ImportContactsButton onImported={reload} />
        <Link href="/contacts/new" className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors">
          <Plus className="w-4 h-4" /> Nuevo contacto
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {contacts.length === 0 ? 'No hay contactos todavía' : 'Ningún resultado para esa búsqueda'}
            </p>
            {contacts.length === 0 && (
              <Link href="/contacts/new" className="text-sky-600 hover:underline text-sm mt-1 inline-block">Agregar el primero</Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Teléfono</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">País</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Creado</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-700">{c.name}</td>
                    <td className="px-5 py-3 text-slate-600">
                      <span className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-slate-400" />{c.phone}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-500">
                      {c.email ? <span className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-slate-400" />{c.email}</span> : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-500">{c.country || '—'}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs hidden lg:table-cell">{formatDate(c.createdAt)}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={deleting === c.id}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
