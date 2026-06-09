'use client'

import { useState } from 'react'

type Reseller = { id: string; name: string }

export function NewUserForm({
  viewerRole,
  resellers,
}: {
  viewerRole: string
  resellers: Reseller[]
}) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
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
        setError(data.error ?? `Error al crear usuario (${res.status})`)
        return
      }

      // Hard redirect — garantiza que la lista se recargue con el nuevo usuario
      window.location.href = '/users'
    } catch (err) {
      setError(`Error de conexión: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error arriba para que siempre sea visible */}
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

      {viewerRole === 'admin' && (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Rol</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value, parentId: '' })}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white"
            >
              <option value="user">Usuario — accede al portal y envía mensajes</option>
              <option value="reseller">Reseller — gestiona sus propios clientes</option>
              <option value="admin">Admin — acceso total al sistema</option>
            </select>
          </div>

          {form.role === 'user' && resellers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Asignar a reseller <span className="text-slate-400 font-normal">(opcional)</span>
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
        </>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Creando...' : viewerRole === 'reseller' ? 'Crear cliente' : 'Crear usuario'}
        </button>
        <a href="/users" className="text-sm text-slate-500 hover:text-slate-700">Cancelar</a>
      </div>
    </form>
  )
}
