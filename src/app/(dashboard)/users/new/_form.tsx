'use client'

import { useState } from 'react'

type Parent = { id: string; name: string }

export function NewUserForm({
  viewerRole,
  resellers,
  clients,
}: {
  viewerRole: string
  resellers: Parent[]
  clients: Parent[]
}) {
  const defaultRole =
    viewerRole === 'reseller' ? 'client' :
    viewerRole === 'client'   ? 'user'   :
    'user'

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: defaultRole,
    parentId: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload: Record<string, string> = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
      }
      if (form.parentId) payload.parentId = form.parentId

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      let data: Record<string, string> = {}
      try {
        data = await res.json()
      } catch {
        setError(`Error del servidor (HTTP ${res.status})`)
        return
      }

      if (!res.ok) {
        setError(data.error ?? `Error al crear (${res.status})`)
        return
      }

      window.location.href = '/users'
    } catch (err) {
      setError(`Error de conexión: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-lg border border-rose-200 font-medium">
          ⚠ {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre completo</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
          placeholder="Juan Pérez"
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo electrónico</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
          placeholder="usuario@empresa.com"
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          placeholder="Mínimo 8 caracteres"
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
      </div>

      {/* Admin: selector de rol y asignación de padre */}
      {viewerRole === 'admin' && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value, parentId: '' })}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white"
            >
              <option value="user">Usuario — empleado que envía mensajes</option>
              <option value="client">Cliente — empresa con sus propios usuarios</option>
              <option value="reseller">Reseller — distribuidor con sus propios clientes</option>
              <option value="admin">Admin — acceso total al sistema</option>
            </select>
          </div>

          {/* Cliente → puede asignarse a un reseller */}
          {form.role === 'client' && resellers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Reseller <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <select
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white"
              >
                <option value="">Sin reseller (cliente directo)</option>
                {resellers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Usuario → debe pertenecer a un cliente */}
          {form.role === 'user' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Cliente</label>
              {clients.length === 0 ? (
                <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 px-3.5 py-2.5 rounded-lg">
                  No hay clientes creados. Crea un cliente primero antes de agregar usuarios.
                </p>
              ) : (
                <select
                  required
                  value={form.parentId}
                  onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white"
                >
                  <option value="">— Selecciona un cliente —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}
        </>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading
            ? 'Creando...'
            : viewerRole === 'reseller' ? 'Crear cliente'
            : viewerRole === 'client'   ? 'Crear usuario'
            : 'Crear'}
        </button>
        <a href="/users" className="text-sm text-slate-500 hover:text-slate-700">Cancelar</a>
      </div>
    </form>
  )
}
