'use client'

import { useState } from 'react'
import { Key, RefreshCw, CreditCard, Plus, RotateCcw } from 'lucide-react'

type User = {
  id: string
  name: string
  email: string
  role: string
  parentId: string | null
  apiKey: string | null
  infobipApiKey: string | null
  infobipBaseUrl: string | null
  pricing: string | null
  billingType: string | null
  balance: number | null
  balanceExpiresAt: string | null
  creditLimit: number | null
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

  // Parse existing pricing
  const existingPricing = (() => { try { return user.pricing ? JSON.parse(user.pricing) : {} } catch { return {} } })()
  const [pricingForm, setPricingForm] = useState({
    sms_marketing:      existingPricing.sms?.marketing?.toString()      ?? '',
    sms_transaccional:  existingPricing.sms?.transaccional?.toString()  ?? '',
    wa_marketing:       existingPricing.whatsapp?.marketing?.toString() ?? '',
    wa_otp:             existingPricing.whatsapp?.otp?.toString()       ?? '',
    wa_notificacion:    existingPricing.whatsapp?.notificacion?.toString() ?? '',
    rcs_simple:         existingPricing.rcs?.simple?.toString()         ?? '',
    rcs_basic:          existingPricing.rcs?.basic?.toString()          ?? '',
    rcs_conversacional: existingPricing.rcs?.conversacional?.toString() ?? '',
  })

  function pv(v: string) { return v === '' ? undefined : parseFloat(v) }

  async function savePricing(e: React.FormEvent) {
    e.preventDefault()
    await patch({
      pricing: JSON.stringify({
        sms:      { marketing: pv(pricingForm.sms_marketing),      transaccional: pv(pricingForm.sms_transaccional) },
        whatsapp: { marketing: pv(pricingForm.wa_marketing),        otp: pv(pricingForm.wa_otp), notificacion: pv(pricingForm.wa_notificacion) },
        rcs:      { simple: pv(pricingForm.rcs_simple),             basic: pv(pricingForm.rcs_basic), conversacional: pv(pricingForm.rcs_conversacional) },
      }),
    }, 'pricing')
  }

  const [billing, setBilling] = useState({
    billingType: user.billingType ?? '',
    balance: user.balance ?? 0,
    balanceExpiresAt: user.balanceExpiresAt ? user.balanceExpiresAt.slice(0, 10) : '',
    creditLimit: user.creditLimit ?? 0,
  })
  const [topupAmount, setTopupAmount] = useState('')
  const [topupExpiry, setTopupExpiry] = useState('')
  const [newLimit, setNewLimit] = useState('')
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
    await billingPost({ type: 'topup', amount: topupAmount, expiresAt: topupExpiry || undefined }, 'topup')
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

      {/* Tarifas por canal — admin edita clientes directos, reseller edita sus clientes */}
      {(user.role === 'account' || user.role === 'client') && (() => {
        const isAdmin    = viewerRole === 'admin' || viewerRole === 'superadmin'
        const isReseller = viewerRole === 'reseller'
        const isDirectClient   = !user.parentId
        const isResellerClient = !!user.parentId
        const canEdit = (isAdmin && isDirectClient) || (isReseller && isResellerClient)
        if (!canEdit) return null

        function PriceInput({ label, k }: { label: string; k: keyof typeof pricingForm }) {
          return (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                <input
                  type="number" step="0.0001" min="0" placeholder="0.0000"
                  value={pricingForm[k]}
                  onChange={(e) => setPricingForm({ ...pricingForm, [k]: e.target.value })}
                  className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
            </div>
          )
        }

        return (
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="font-semibold text-slate-800 mb-1">Tarifas por canal</h2>
            <p className="text-sm text-slate-500 mb-5">Precio en MXN por mensaje enviado según canal y categoría.</p>
            <form onSubmit={savePricing} className="space-y-5">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SMS</p>
                <div className="grid grid-cols-2 gap-3">
                  <PriceInput label="Marketing"     k="sms_marketing" />
                  <PriceInput label="Transaccional" k="sms_transaccional" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">WhatsApp</p>
                <div className="grid grid-cols-3 gap-3">
                  <PriceInput label="Marketing"    k="wa_marketing" />
                  <PriceInput label="OTP"          k="wa_otp" />
                  <PriceInput label="Notificación" k="wa_notificacion" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">RCS</p>
                <div className="grid grid-cols-3 gap-3">
                  <PriceInput label="Simple"         k="rcs_simple" />
                  <PriceInput label="Basic"          k="rcs_basic" />
                  <PriceInput label="Conversacional" k="rcs_conversacional" />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={loading === 'pricing'}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors">
                  {loading === 'pricing' ? 'Guardando...' : 'Guardar tarifas'}
                </button>
                {saved === 'pricing' && <span className="text-sm text-emerald-600">✓ Guardado</span>}
              </div>
            </form>
          </div>
        )
      })()}

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
            <div className="flex gap-2">
              {[
                { value: '', label: 'Sin facturación' },
                { value: 'prepaid', label: 'Prepago' },
                { value: 'postpaid', label: 'Postpago' },
              ].map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => changeBillingType(opt.value)}
                  disabled={loading === 'billingType'}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                    billing.billingType === opt.value
                      ? 'bg-sky-600 text-white border-sky-600'
                      : 'bg-white text-slate-600 border-slate-300 hover:border-sky-400'
                  }`}>
                  {opt.label}
                </button>
              ))}
              {saved === 'billingType' && <span className="text-sm text-emerald-600 self-center ml-1">✓</span>}
            </div>
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
                <div className="flex items-center gap-3">
                  <button type="submit" disabled={loading === 'topup'}
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

      <div className="flex justify-end">
        <a href="/users" className="text-sm text-slate-500 hover:text-slate-700">← Volver a la lista</a>
      </div>
    </div>
  )
}
