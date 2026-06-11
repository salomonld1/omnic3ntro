'use client'

import { useState } from 'react'

type Parent = { id: string; name: string }

type PricingForm = {
  sms_marketing: string; sms_transaccional: string
  wa_marketing: string;  wa_otp: string; wa_notificacion: string
  rcs_simple: string;    rcs_basic: string; rcs_conversacional: string
}

const emptyPricing: PricingForm = {
  sms_marketing: '', sms_transaccional: '',
  wa_marketing: '', wa_otp: '', wa_notificacion: '',
  rcs_simple: '', rcs_basic: '', rcs_conversacional: '',
}

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
    viewerRole === 'reseller' ? 'account' :
    viewerRole === 'account'  ? 'user'    :
    'user'

  const [form, setForm] = useState({
    name: '', email: '', password: '',
    role: defaultRole, parentId: '',
    billingType: 'prepaid',
    balanceManager: 'both',
  })
  const [pricing, setPricing] = useState<PricingForm>(emptyPricing)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const isAdmin    = viewerRole === 'admin' || viewerRole === 'superadmin'
  const isReseller = viewerRole === 'reseller'
  const isAccount  = viewerRole === 'account' || viewerRole === 'client'
  const showBilling        = (isAdmin || isReseller) && form.role === 'account'
                          || isAdmin && form.role === 'reseller'
  const showPricing        = (isAdmin || isReseller) && form.role === 'account'
  const showBalanceManager = isAdmin && form.role === 'reseller'

  function p(v: string) { return v === '' ? undefined : parseFloat(v) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const payload: Record<string, unknown> = {
        name: form.name, email: form.email, password: form.password, role: form.role,
      }
      if (form.parentId) payload.parentId = form.parentId
      if (showBilling)   payload.billingType = form.billingType
      if (showBalanceManager) payload.balanceManager = form.balanceManager

      if (showPricing) {
        payload.pricing = JSON.stringify({
          sms:      { marketing: p(pricing.sms_marketing),      transaccional: p(pricing.sms_transaccional) },
          whatsapp: { marketing: p(pricing.wa_marketing),        otp: p(pricing.wa_otp), notificacion: p(pricing.wa_notificacion) },
          rcs:      { simple: p(pricing.rcs_simple),             basic: p(pricing.rcs_basic), conversacional: p(pricing.rcs_conversacional) },
        })
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      let data: Record<string, string> = {}
      try { data = await res.json() } catch { setError(`Error del servidor (HTTP ${res.status})`); return }
      if (!res.ok) { setError(data.error ?? `Error al crear (${res.status})`); return }
      window.location.href = '/users'
    } catch (err) {
      setError(`Error de conexión: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  function Field({ label, name, type = 'text', placeholder, required = false }: {
    label: string; name: keyof typeof form; type?: string; placeholder?: string; required?: boolean
  }) {
    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
        <input
          type={type} value={form[name] as string} required={required} placeholder={placeholder}
          onChange={(e) => setForm({ ...form, [name]: e.target.value })}
          className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>
    )
  }

  function PriceField({ label, k }: { label: string; k: keyof PricingForm }) {
    return (
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
          <input
            type="number" step="0.0001" min="0" placeholder="0.0000"
            value={pricing[k]}
            onChange={(e) => setPricing({ ...pricing, [k]: e.target.value })}
            className="w-full pl-6 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-rose-50 text-rose-700 text-sm px-4 py-3 rounded-lg border border-rose-200 font-medium">
          ⚠ {error}
        </div>
      )}

      <Field label="Nombre completo" name="name" placeholder="Juan Pérez" required />
      <Field label="Correo electrónico" name="email" type="email" placeholder="usuario@empresa.com" required />
      <Field label="Contraseña" name="password" type="password" placeholder="Mínimo 8 caracteres" required />

      {/* Selector de rol */}
      {isAdmin && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Rol</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value, parentId: '' })}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="user">Usuario — empleado que envía mensajes</option>
            <option value="account">Cuenta/Cliente — empresa con sus propios usuarios</option>
            <option value="reseller">Reseller — distribuidor con sus propios clientes</option>
            {viewerRole === 'superadmin' && <option value="admin">Admin — administrador del sistema</option>}
          </select>
        </div>
      )}

      {isReseller && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de acceso</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value, parentId: '' })}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="account">Cliente — empresa que recibe el servicio</option>
            <option value="user">Usuario — empleado del distribuidor</option>
          </select>
        </div>
      )}

      {/* Reseller como padre de una cuenta */}
      {isAdmin && form.role === 'account' && resellers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Reseller <span className="text-slate-400 font-normal">(opcional — cliente directo si vacío)</span>
          </label>
          <select
            value={form.parentId}
            onChange={(e) => setForm({ ...form, parentId: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="">Sin reseller (cliente directo)</option>
            {resellers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
      )}

      {/* Usuario → debe pertenecer a una cuenta */}
      {(isAdmin || isReseller) && form.role === 'user' && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Cuenta / Cliente</label>
          {clients.length === 0 ? (
            <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 px-3.5 py-2.5 rounded-lg">
              No hay cuentas creadas. Crea una cuenta primero.
            </p>
          ) : (
            <select
              required value={form.parentId}
              onChange={(e) => setForm({ ...form, parentId: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
            >
              <option value="">— Selecciona una cuenta —</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
      )}

      {/* Tipo de billing para cuentas y resellers directos */}
      {showBilling && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de facturación</label>
          <div className="flex gap-3">
            {['prepaid', 'postpaid'].map((t) => (
              <label key={t} className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors ${form.billingType === t ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <input type="radio" name="billingType" value={t} checked={form.billingType === t}
                  onChange={() => setForm({ ...form, billingType: t })} className="sr-only" />
                <span className="text-sm font-medium">{t === 'prepaid' ? 'Prepago' : 'Pospago'}</span>
                <span className="text-xs text-slate-500">{t === 'prepaid' ? '(saldo asignado)' : '(límite de crédito)'}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* quién puede asignar saldo a clientes de este reseller */}
      {showBalanceManager && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">¿Quién asigna saldo a los clientes de este reseller?</label>
          <select
            value={form.balanceManager}
            onChange={(e) => setForm({ ...form, balanceManager: e.target.value })}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="admin">Solo Admin (C3ntro)</option>
            <option value="reseller">Solo el Reseller</option>
            <option value="both">Ambos (Admin y Reseller)</option>
          </select>
        </div>
      )}

      {/* Tarifas por canal/categoría — solo clientes directos del admin */}
      {showPricing && (
        <div className="space-y-4 pt-2 border-t border-slate-200">
          <p className="text-sm font-semibold text-slate-700">Tarifas por canal (MXN por mensaje)</p>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">SMS</p>
            <div className="grid grid-cols-2 gap-3">
              <PriceField label="Marketing" k="sms_marketing" />
              <PriceField label="Transaccional" k="sms_transaccional" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">WhatsApp</p>
            <div className="grid grid-cols-3 gap-3">
              <PriceField label="Marketing" k="wa_marketing" />
              <PriceField label="OTP" k="wa_otp" />
              <PriceField label="Notificación" k="wa_notificacion" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">RCS</p>
            <div className="grid grid-cols-3 gap-3">
              <PriceField label="Simple" k="rcs_simple" />
              <PriceField label="Basic" k="rcs_basic" />
              <PriceField label="Conversacional" k="rcs_conversacional" />
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit" disabled={loading}
          className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? 'Creando...' :
           isReseller && form.role === 'account' ? 'Crear cliente' :
           isReseller && form.role === 'user'    ? 'Crear usuario' :
           isAccount                             ? 'Crear usuario' :
           'Crear'}
        </button>
        <a href="/users" className="text-sm text-slate-500 hover:text-slate-700">Cancelar</a>
      </div>
    </form>
  )
}
