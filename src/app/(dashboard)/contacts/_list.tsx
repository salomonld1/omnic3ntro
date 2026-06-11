'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Users, Plus, Phone, Mail, Trash2, Pencil, Tag,
  ChevronsUpDown, ChevronUp, ChevronDown, X,
} from 'lucide-react'
import { ImportContactsButton } from './_import-button'
import { formatDate } from '@/lib/utils'

type Contact = {
  id: string
  name: string
  phone: string
  email: string | null
  country: string | null
  tags: string | null
  createdAt: string
}

type SortKey = 'name' | 'phone' | 'country' | 'createdAt'
type SortDir = 'asc' | 'desc'

function parseTags(t: string | null): string[] {
  return t ? t.split(',').map((s) => s.trim()).filter(Boolean) : []
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 ml-1 text-slate-400" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 ml-1 text-sky-600" />
    : <ChevronDown className="w-3 h-3 ml-1 text-sky-600" />
}

function TagBadge({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
      {label}
      {onRemove && (
        <button type="button" onClick={onRemove} className="hover:text-sky-900 transition-colors">
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  )
}

interface EditModalProps {
  contact: Contact
  onClose: () => void
  onSaved: (updated: Contact) => void
}

function EditModal({ contact, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    name: contact.name,
    phone: contact.phone,
    email: contact.email ?? '',
    country: contact.country ?? '',
    tags: parseTags(contact.tags),
  })
  const [tagInput, setTagInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function addTag(tag: string) {
    const t = tag.trim()
    if (t && !form.tags.includes(t)) {
      setForm((p) => ({ ...p, tags: [...p.tags, t] }))
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setForm((p) => ({ ...p, tags: p.tags.filter((t) => t !== tag) }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email || null,
          country: form.country || null,
          tags: form.tags.join(',') || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar')
      onSaved({ ...data, createdAt: contact.createdAt })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Editar contacto</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {[
            { id: 'name', label: 'Nombre', type: 'text', required: true },
            { id: 'phone', label: 'Teléfono', type: 'tel', required: true },
            { id: 'email', label: 'Email', type: 'email', required: false },
            { id: 'country', label: 'País', type: 'text', required: false },
          ].map(({ id, label, type, required }) => (
            <div key={id}>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {label} {required && <span className="text-rose-500">*</span>}
              </label>
              <input
                type={type}
                value={form[id as keyof typeof form] as string}
                onChange={(e) => setForm({ ...form, [id]: e.target.value })}
                required={required}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          ))}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Etiquetas</label>
            <div className="flex flex-wrap gap-1 mb-2">
              {form.tags.map((t) => <TagBadge key={t} label={t} onRemove={() => removeTag(t)} />)}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
                placeholder="Nueva etiqueta + Enter"
                className="flex-1 px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => addTag(tagInput)}
                disabled={!tagInput.trim()}
                className="px-3 py-2 bg-sky-50 hover:bg-sky-100 disabled:opacity-40 text-sky-700 text-sm rounded-lg transition-colors"
              >
                Agregar
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg border border-rose-200">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ContactList({ initialContacts }: { initialContacts: Contact[] }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [filter, setFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const allTags = useMemo(() => {
    const set = new Set<string>()
    contacts.forEach((c) => parseTags(c.tags).forEach((t) => set.add(t)))
    return Array.from(set).sort()
  }, [contacts])

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  async function reload() {
    const res = await fetch('/api/contacts')
    if (res.ok) setContacts(await res.json())
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar a "${name}"?`)) return
    setDeleting(id)
    const res = await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    if (res.ok) setContacts((prev) => prev.filter((c) => c.id !== id))
    setDeleting(null)
  }

  const filtered = useMemo(() => {
    let list = contacts.filter((c) => {
      if (filter && !c.name.toLowerCase().includes(filter.toLowerCase()) &&
        !c.phone.includes(filter) &&
        !(c.email ?? '').toLowerCase().includes(filter.toLowerCase())) return false
      if (tagFilter && !parseTags(c.tags).includes(tagFilter)) return false
      return true
    })
    list = [...list].sort((a, b) => {
      const m = sortDir === 'asc' ? 1 : -1
      if (sortKey === 'name') return m * a.name.localeCompare(b.name)
      if (sortKey === 'phone') return m * a.phone.localeCompare(b.phone)
      if (sortKey === 'country') return m * (a.country ?? '').localeCompare(b.country ?? '')
      if (sortKey === 'createdAt') return m * (a.createdAt < b.createdAt ? -1 : 1)
      return 0
    })
    return list
  }, [contacts, filter, tagFilter, sortKey, sortDir])

  function SortTh({ col, children }: { col: SortKey; children: React.ReactNode }) {
    return (
      <th
        className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer select-none hover:text-slate-700"
        onClick={() => handleSort(col)}
      >
        <span className="inline-flex items-center">
          {children}
          <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
        </span>
      </th>
    )
  }

  return (
    <div>
      {editing && (
        <EditModal
          contact={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setContacts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
            setEditing(null)
          }}
        />
      )}

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <input
          type="search"
          placeholder="Buscar por nombre, teléfono o email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-48 max-w-xs px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
        {allTags.length > 0 && (
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-slate-400" />
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="">Todas las etiquetas</option>
              {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
        <span className="text-sm text-slate-500 mr-auto">{filtered.length} contacto{filtered.length !== 1 ? 's' : ''}</span>
        <ImportContactsButton onImported={reload} existingTags={allTags} />
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
                  <SortTh col="name">Nombre</SortTh>
                  <SortTh col="phone">Teléfono</SortTh>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                  <SortTh col="country">País</SortTh>
                  <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Etiquetas</th>
                  <SortTh col="createdAt">Creado</SortTh>
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
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        {parseTags(c.tags).map((t) => (
                          <button
                            key={t}
                            onClick={() => setTagFilter(tagFilter === t ? '' : t)}
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                              tagFilter === t
                                ? 'bg-sky-600 text-white border-sky-600'
                                : 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{formatDate(c.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditing(c)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.name)}
                          disabled={deleting === c.id}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
