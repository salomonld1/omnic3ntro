'use client'

import { useState } from 'react'
import { Key, RefreshCw } from 'lucide-react'

type User = {
  id: string
  name: string
  email: string
  role: string
  parentId: string | null
  apiKey: string | null
  infobipApiKey: string | null
  infobipBaseUrl: string | null
  pricePerMessage: number | null
  parent: { id: string; name: string } | null
}

type Reseller = { id: string; name: string }

export function EditUserForm({
  user,
  viewerRole,
  resellers,
}: {
  user: User
  viewerRole: string
  resellers: Reseller[]
}) {
  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
    password: '',
    role: user.role,
    parentId: user.parentId ?? '',
  })
  const [infobip, setInfobip] = useState({
    apiKey: user.infobipApiKey ?? '',
    baseUrl: user.infobipBaseUrl ?? '',
  })
  const [apiKey, setApiKey] = useState(user.apiKey)
  const [price, setPrice] = useState(user.pricePerMessage?.toString() ?? '')
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  async function patch(data: Record<string, unknown>, section: string) {
    setError('')
    setLoading(section)
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'Error al guardar')
        return null
      }
      setSaved(section)
      setTimeout(() => setSaved(null), 3000)
      return json
    } finally {
      setLoading(null)
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    const data: Record<string, unknown> = {
      name: profile.name,
      email: profile.email,
      role: profile.role,
      parentId: profile.parentId || null,
    }
    if (profile.password) data.password = profile.password
    await patch(data, 'profile')
  }

  async function saveInfobip(e: React.FormEvent) {
    e.preventDefault()
    await patch({ infobipApiKey: infobip.apiKey, infobipBaseUrl: infobip.baseUrl }, 'infobip')
  }

  async function handleGenerateApiKey() {
    const result = await patch({ generateApiKey: true }, 'apikey')
    if (result) setApiKey(result.apiKey)
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-5">Perfil</h2>
        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre</label>
              <input type="text" value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Rol</label>
              {viewerRole === 'admin' ? (
                <select value={profile.role}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value, parentId: '' })}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white">
                  <option value="user">Usuario</option>
                  <option value="reseller">Reseller</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <div className="px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-500 bg-slate-50">
                  Usuario
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              required
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
          </div>

          {viewerRole === 'admin' && profile.role === 'user' && resellers.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Reseller <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <select value={profile.parentId}
                onChange={(e) => setProfile({ ...profile, parentId: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white">
                <option value="">Sin reseller (cliente directo)</option>
                {resellers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {user.parent && (
                <p className="text-xs text-slate-400 mt-1">Actualmente: {user.parent.name}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Nueva contraseña <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input type="password" value={profile.password}
              onChange={(e) => setProfile({ ...profile, password: e.target.value })}
              placeholder="Dejar vacío para no cambiar"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
          </div>

          {error && <div className="bg-rose-50 text-rose-600 text-sm px-3.5 py-2.5 rounded-lg border border-rose-200">{error}</div>}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading === 'profile'}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
              {loading === 'profile' ? 'Guardando...' : 'Guardar perfil'}
            </button>
            {saved === 'profile' && <span className="text-sm text-emerald-600">✓ Guardado</span>}
          </div>
        </form>
      </div>

      {/* Infobip — solo para resellers y users (no para admins) */}
      {user.role !== 'admin' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-1">Credenciales Infobip</h2>
          <p className="text-sm text-slate-500 mb-5">
            {user.role === 'reseller'
              ? 'Credenciales propias del reseller. Sus clientes las usarán si no tienen las suyas.'
              : 'Credenciales propias del cliente. Si están vacías, usará las de su reseller (o las globales).'}
          </p>
          <form onSubmit={saveInfobip} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">API Key</label>
              <input type="password" value={infobip.apiKey}
                onChange={(e) => setInfobip({ ...infobip, apiKey: e.target.value })}
                placeholder="API Key de Infobip"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Base URL</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border-slate-300 rounded-l-lg bg-slate-50 text-slate-500 text-sm">https://</span>
                <input type="text" value={infobip.baseUrl}
                  onChange={(e) => setInfobip({ ...infobip, baseUrl: e.target.value })}
                  placeholder="xxxxxx.api.infobip.com"
                  className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={loading === 'infobip'}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                {loading === 'infobip' ? 'Guardando...' : 'Guardar Infobip'}
              </button>
              {saved === 'infobip' && <span className="text-sm text-emerald-600">✓ Guardado</span>}
            </div>
          </form>
        </div>
      )}

      {/* Precio por mensaje — solo visible para quien establece ese precio */}
      {user.role !== 'admin' && !(viewerRole === 'reseller' && user.role === 'reseller') && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-1">Precio por mensaje</h2>
          <p className="text-sm text-slate-500 mb-5">
            {viewerRole === 'admin' && user.role === 'reseller'
              ? 'Precio que C3ntro le cobra a este reseller por cada mensaje. El reseller no puede ver este precio.'
              : viewerRole === 'reseller'
              ? 'Precio que le cobras a este cliente por cada mensaje enviado.'
              : 'Precio que se le cobra a este cliente por cada mensaje enviado.'}
          </p>
          <form onSubmit={async (e) => { e.preventDefault(); await patch({ pricePerMessage: price ? parseFloat(price) : null }, 'price') }} className="space-y-4">
            <div className="flex items-center gap-3 max-w-xs">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input
                  type="number" step="0.0001" min="0" value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.2200"
                  className="w-full pl-7 pr-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                />
              </div>
              <span className="text-sm text-slate-500">MXN / mensaje</span>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={loading === 'price'}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                {loading === 'price' ? 'Guardando...' : 'Guardar precio'}
              </button>
              {saved === 'price' && <span className="text-sm text-emerald-600">✓ Guardado</span>}
            </div>
          </form>
        </div>
      )}

      {/* API Key del portal */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-800 mb-1">API Key del Portal</h2>
        <p className="text-sm text-slate-500 mb-5">Para consumir la plataforma vía API sin pasar por el portal web.</p>
        <div className="flex items-center gap-3">
          {apiKey ? (
            <code className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-700 truncate">
              {apiKey}
            </code>
          ) : (
            <span className="flex-1 text-sm text-slate-400">Sin API key generada</span>
          )}
          <button
            onClick={handleGenerateApiKey}
            disabled={loading === 'apikey'}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-300 hover:border-sky-500 hover:text-sky-600 text-slate-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {loading === 'apikey' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
            {apiKey ? 'Regenerar' : 'Generar key'}
          </button>
          {saved === 'apikey' && <span className="text-sm text-emerald-600">✓ Generada</span>}
        </div>
        {apiKey && (
          <p className="text-xs text-amber-600 mt-2">⚠ Copia esta key ahora. No se puede recuperar después de regenerarla.</p>
        )}
      </div>

      <div className="flex justify-end">
        <a href="/users" className="text-sm text-slate-500 hover:text-slate-700">← Volver a la lista</a>
      </div>
    </div>
  )
}
