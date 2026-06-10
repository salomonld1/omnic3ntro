'use client'

import { useState } from 'react'
import { Key, RefreshCw, CreditCard, Plus, RotateCcw, Lock, History } from 'lucide-react'
import Link from 'next/link'

type User = {
  id: string
  name: string
  email: string
  role: string
  parentId: string | null
  apiKey: string | null
  infobipApiKey: string | null
  infobipBaseUrl: string | null
  infobipAppId: string | null
  pricePerMessage: number | null
  billingType: string | null
  balance: number | null
  balanceExpiresAt: string | null
  creditLimit: number | null
  alertAmount: number | null
  parent: { id: string; name: string } | null
}

type ParentOption = { id: string; name: string }

export function EditUserForm({
  user,
  viewerRole,
  resellers,
  clients,
}: {
  user: User
  viewerRole: string
  resellers: ParentOption[]
  clients: ParentOption[]
}) {
  const [profile, setProfile] = useState({
    name: user.name,
    email: user.email,
    role: user.role,
    parentId: user.parentId ?? '',
  })
  const [pwd, setPwd] = useState('')
  const [infobip, setInfobip] = useState({
    apiKey: user.infobipApiKey ?? '',
    baseUrl: user.infobipBaseUrl ?? '',
    appId: user.infobipAppId ?? '',
  })
  const [apiKey, setApiKey] = useState(user.apiKey)
  const [price, setPrice] = useState(user.pricePerMessage?.toString() ?? '')
  const [billing, setBilling] = useState({
    billingType: user.billingType ?? '',
    balance: user.balance ?? 0,
    balanceExpiresAt: user.balanceExpiresAt ? user.balanceExpiresAt.slice(0, 10) : '',
    creditLimit: user.creditLimit ?? 0,
  })
  const [topupAmount, setTopupAmount] = useState('')
  const [topupExpiry, setTopupExpiry] = useState('')
  const [topupNote, setTopupNote] = useState('')
  const [newLimit, setNewLimit] = useState('')
  const [newAlert, setNewAlert] = useState(user.alertAmount?.toString() ?? '')
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
    await patch({
      name: profile.name,
      email: profile.email,
      role: profile.role,
      parentId: profile.parentId || null,
    }, 'profile')
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!pwd) return
    await patch({ password: pwd }, 'password')
    setPwd('')
  }

  async function saveInfobip(e: React.FormEvent) {
    e.preventDefault()
    await patch({ infobipApiKey: infobip.apiKey, infobipBaseUrl: infobip.baseUrl, infobipAppId: infobip.appId }, 'infobip')
  }

  async function billingPost(body: Record<string, unknown>, section: string) {
    setError('')
    setLoading(section)
    try {
      const res = await fetch(`/api/users/${user.id}/balance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error ?? 'Error'); return }
      setSaved(section)
      setTimeout(() => setSaved(null), 3000)
      // Refresh billing state from server
      const u = await fetch(`/api/users/${user.id}`).then((r) => r.json())
      setBilling({
        billingType: u.billingType ?? '',
        balance: u.balance ?? 0,
        balanceExpiresAt: u.balanceExpiresAt ? u.balanceExpiresAt.slice(0, 10) : '',
        creditLimit: u.creditLimit ?? 0,
      })
      setTopupAmount('')
      setTopupExpiry('')
      setNewLimit('')
    } finally {
      setLoading(null)
    }
  }

  async function changeBillingType(type: string) {
    await billingPost({ billingType: type }, 'billingType')
  }

  async function handleTopup(e: React.FormEvent) {
    e.preventDefault()
    await billingPost({ type: 'topup', amount: topupAmount, note: topupNote.trim(), expiresAt: topupExpiry || undefined }, 'topup')
    setTopupNote('')
  }

  async function handleSetLimit(e: React.FormEvent) {
    e.preventDefault()
    await billingPost({ type: 'set_limit', creditLimit: newLimit }, 'setLimit')
  }

  async function handleResetDebt() {
    if (!confirm('¿Confirmar que la deuda fue saldada? Esto reiniciará el uso a $0.')) return
    await billingPost({ type: 'reset_debt' }, 'resetDebt')
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
                  <option value="client">Cliente</option>
                  <option value="reseller">Reseller</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <div className="px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-500 bg-slate-50">
                  {viewerRole === 'client' ? 'Usuario' : 'Cliente'}
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

          {viewerRole === 'admin' && profile.role === 'reseller' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Superior <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <select value={profile.parentId}
                onChange={(e) => setProfile({ ...profile, parentId: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white">
                <option value="">Sin superior</option>
                {resellers.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              {user.parent && (
                <p className="text-xs text-slate-400 mt-1">Actualmente: {user.parent.name}</p>
              )}
            </div>
          )}

          {viewerRole === 'admin' && profile.role === 'user' && clients.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Cliente <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <select value={profile.parentId}
                onChange={(e) => setProfile({ ...profile, parentId: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent bg-white">
                <option value="">Sin cliente asignado</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {user.parent && (
                <p className="text-xs text-slate-400 mt-1">Actualmente: {user.parent.name}</p>
              )}
            </div>
          )}

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

      {/* Conector — solo para resellers y users (no para admins) */}
      {user.role !== 'admin' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-800 mb-1">Credenciales de proveedor</h2>
          <p className="text-sm text-slate-500 mb-5">
            {user.role === 'reseller'
              ? 'Credenciales propias del distribuidor. Sus clientes las usarán si no tienen las suyas.'
              : user.role === 'client'
              ? 'Credenciales de la empresa. Sus usuarios las heredarán automáticamente.'
              : 'Credenciales propias. Si están vacías, hereda las de su cliente o distribuidor.'}
          </p>
          <form onSubmit={saveInfobip} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">API Key</label>
              <input type="password" value={infobip.apiKey}
                onChange={(e) => setInfobip({ ...infobip, apiKey: e.target.value })}
                placeholder="API Key"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Base URL</label>
              <div className="flex">
                <span className="inline-flex items-center px-3 border border-r-0 border-slate-300 rounded-l-lg bg-slate-50 text-slate-500 text-sm">https://</span>
                <input type="text" value={infobip.baseUrl}
                  onChange={(e) => setInfobip({ ...infobip, baseUrl: e.target.value })}
                  placeholder={viewerRole === 'admin' ? 'xxxxxx.api.infobip.com' : 'URL de acceso'}
                  className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Application ID <span className="text-slate-400 font-normal">(Infobip)</span>
              </label>
              <input type="text" value={infobip.appId}
                onChange={(e) => setInfobip({ ...infobip, appId: e.target.value.replace(/\D/g, '').slice(0, 5) })}
                placeholder="Ej: 12345"
                inputMode="numeric"
                minLength={5}
                maxLength={5}
                pattern="[0-9]{5}"
                required={user.role === 'client' || user.role === 'reseller'}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono" />
              <p className="text-xs text-slate-400 mt-1">ID de la Application creada en el portal de Infobip. Se usa para filtrar reportes por cliente.</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" disabled={loading === 'infobip'}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                {loading === 'infobip' ? 'Guardando...' : 'Guardar credenciales'}
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

      {/* Facturación — para clientes (la billing vive en el nivel cliente) */}
      {user.role === 'client' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard className="w-5 h-5 text-sky-600" />
            <h2 className="font-semibold text-slate-800">Facturación</h2>
          </div>
          <p className="text-sm text-slate-500 mb-5">Tipo de facturación y gestión de saldo o crédito.</p>

          {/* Tipo de facturación */}
          <div className="mb-5">
            <p className="text-sm font-medium text-slate-700 mb-2">Tipo</p>
            {billing.billingType ? (
              <span className={`inline-flex px-4 py-2 rounded-lg text-sm font-medium border ${
                billing.billingType === 'prepaid'
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : 'bg-violet-50 text-violet-700 border-violet-200'
              }`}>
                {billing.billingType === 'prepaid' ? 'Prepago' : 'Postpago'}
              </span>
            ) : (
              <div className="flex gap-2">
                {[
                  { value: 'prepaid', label: 'Prepago' },
                  { value: 'postpaid', label: 'Postpago' },
                ].map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => changeBillingType(opt.value)}
                    disabled={loading === 'billingType'}
                    className="px-4 py-2 rounded-lg text-sm font-medium border bg-white text-slate-600 border-slate-300 hover:border-sky-400 transition-colors disabled:opacity-50">
                    {opt.label}
                  </button>
                ))}
                {saved === 'billingType' && <span className="text-sm text-emerald-600 self-center ml-1">✓</span>}
              </div>
            )}
          </div>

          {/* Prepago */}
          {billing.billingType === 'prepaid' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">Saldo disponible</p>
                  <p className={`text-xl font-bold ${billing.balance <= 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                    ${billing.balance.toFixed(2)} MXN
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">Vigencia</p>
                  <p className={`text-sm font-semibold ${
                    billing.balanceExpiresAt && new Date(billing.balanceExpiresAt) < new Date() ? 'text-rose-500' : 'text-slate-700'
                  }`}>
                    {billing.balanceExpiresAt
                      ? new Date(billing.balanceExpiresAt).toLocaleDateString('es-MX')
                      : <span className="text-slate-400">Sin vencimiento</span>}
                  </p>
                </div>
              </div>

              <form onSubmit={handleTopup} className="border border-slate-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-600" /> Agregar saldo
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" step="0.01" min="0.01" required value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="500.00"
                      className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <input type="date" value={topupExpiry}
                    onChange={(e) => setTopupExpiry(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <p className="text-xs text-slate-400">Monto (MXN) · Vigencia (opcional, sobreescribe la anterior)</p>
                <input
                  type="text"
                  required
                  value={topupNote}
                  onChange={(e) => setTopupNote(e.target.value)}
                  placeholder="Nota — ej: Pago factura #123"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                <div className="flex items-center gap-3">
                  <button type="submit" disabled={loading === 'topup' || !topupNote.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                    <Plus className="w-4 h-4" /> {loading === 'topup' ? 'Guardando...' : 'Recargar'}
                  </button>
                  {saved === 'topup' && <span className="text-sm text-emerald-600">✓ Saldo actualizado</span>}
                </div>
              </form>
            </div>
          )}

          {/* Postpago */}
          {billing.billingType === 'postpaid' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">Crédito autorizado</p>
                  <p className="text-xl font-bold text-slate-800">
                    {billing.creditLimit > 0 ? `$${billing.creditLimit.toFixed(2)} MXN` : <span className="text-slate-400">Sin límite</span>}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg px-4 py-3">
                  <p className="text-xs text-slate-500 mb-0.5">Uso acumulado</p>
                  <p className={`text-xl font-bold ${
                    billing.creditLimit > 0 && billing.balance >= billing.creditLimit * 0.9 ? 'text-rose-500' : 'text-slate-800'
                  }`}>
                    ${billing.balance.toFixed(2)} MXN
                  </p>
                </div>
              </div>

              {billing.creditLimit > 0 && (
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${billing.balance >= billing.creditLimit ? 'bg-rose-500' : billing.balance >= billing.creditLimit * 0.8 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (billing.balance / billing.creditLimit) * 100)}%` }}
                  />
                </div>
              )}

              <form onSubmit={handleSetLimit} className="border border-slate-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-slate-700">Establecer límite de crédito</p>
                <div className="flex items-center gap-3 max-w-xs">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" step="0.01" min="0" required value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value)}
                      placeholder="1000.00"
                      className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <button type="submit" disabled={loading === 'setLimit'}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                    {loading === 'setLimit' ? 'Guardando...' : 'Guardar'}
                  </button>
                  {saved === 'setLimit' && <span className="text-sm text-emerald-600">✓</span>}
                </div>
              </form>

              <form onSubmit={async (e) => { e.preventDefault(); await billingPost({ type: 'set_alert', alertAmount: newAlert }, 'alert') }} className="border border-slate-200 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-slate-700">Alerta de saldo</p>
                <p className="text-xs text-slate-400">Se enviará un email cuando el uso supere este monto.</p>
                <div className="flex items-center gap-3 max-w-xs">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" step="0.01" min="0" required value={newAlert}
                      onChange={(e) => setNewAlert(e.target.value)}
                      placeholder="500.00"
                      className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <button type="submit" disabled={loading === 'alert'}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                    {loading === 'alert' ? 'Guardando...' : 'Guardar'}
                  </button>
                  {saved === 'alert' && <span className="text-sm text-emerald-600">✓</span>}
                </div>
              </form>

              <div className="flex items-center gap-3">
                <button type="button" onClick={handleResetDebt} disabled={loading === 'resetDebt' || billing.balance === 0}
                  className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:border-amber-400 hover:text-amber-600 text-slate-600 text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                  <RotateCcw className="w-4 h-4" /> Marcar deuda como saldada
                </button>
                {saved === 'resetDebt' && <span className="text-sm text-emerald-600">✓ Deuda reiniciada</span>}
              </div>
            </div>
          )}

          {error && billing.billingType !== '' && (
            <div className="mt-3 bg-rose-50 text-rose-600 text-sm px-3.5 py-2.5 rounded-lg border border-rose-200">{error}</div>
          )}
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

      {/* Contraseña */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-slate-500" />
          <h2 className="font-semibold text-slate-800">Contraseña</h2>
        </div>
        <p className="text-sm text-slate-500 mb-5">Escribe una nueva contraseña para reemplazar la actual.</p>
        <form onSubmit={savePassword} className="space-y-4">
          <div className="max-w-sm">
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="Nueva contraseña"
              minLength={6}
              required
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={loading === 'password' || !pwd}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
              {loading === 'password' ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
            {saved === 'password' && <span className="text-sm text-emerald-600">✓ Contraseña actualizada</span>}
          </div>
        </form>
      </div>

      {/* Historial de transacciones — para clientes y resellers */}
      {(user.role === 'client' || user.role === 'reseller') && (
        <Link
          href={`/users/${user.id}/transactions`}
          className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-300 hover:bg-sky-50 transition-colors group"
        >
          <div className="p-2.5 bg-slate-100 rounded-lg group-hover:bg-sky-100 transition-colors">
            <History className="w-5 h-5 text-slate-500 group-hover:text-sky-600 transition-colors" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-slate-800">Historial de transacciones</p>
            <p className="text-sm text-slate-400">Ver recargas y débitos de este cliente</p>
          </div>
          <span className="text-slate-300 group-hover:text-sky-400 text-lg">→</span>
        </Link>
      )}

      <div className="flex justify-end">
        <a href="/users" className="text-sm text-slate-500 hover:text-slate-700">← Volver a la lista</a>
      </div>
    </div>
  )
}
