'use client'

import { useState } from 'react'
import { Search, Wallet, CreditCard, ChevronRight } from 'lucide-react'

type Account = {
  id: string; name: string; email: string; role: string
  billingType: string | null; balance: number | null; creditLimit: number | null
  balanceExpiresAt: Date | string | null; balanceManager: string | null
  parent: { id: string; name: string } | null
}

function fmt(n: number | null) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(n)
}

function roleBadge(role: string) {
  const map: Record<string, string> = {
    reseller: 'bg-purple-100 text-purple-700',
    account:  'bg-sky-100 text-sky-700',
    client:   'bg-sky-100 text-sky-700',
  }
  const labels: Record<string, string> = { reseller: 'Reseller', account: 'Cuenta', client: 'Cuenta' }
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[role] ?? 'bg-slate-100 text-slate-600'}`}>
      {labels[role] ?? role}
    </span>
  )
}

export function BillingClient({ accounts, adminRole }: { accounts: Account[]; adminRole: string }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Account | null>(null)
  const [panel, setPanel] = useState<'topup' | 'limit' | 'type' | null>(null)
  const [amount, setAmount] = useState('')
  const [expiry, setExpiry] = useState('')
  const [newType, setNewType] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase()
    return a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)
  })

  function canManageBalance(a: Account) {
    if (adminRole === 'superadmin') return true
    const bm = a.balanceManager
    if (!bm || bm === 'admin' || bm === 'both') return true
    return false
  }

  function openPanel(a: Account, type: 'topup' | 'limit' | 'type') {
    setSelected(a); setPanel(type); setAmount(''); setExpiry(''); setMsg(null)
    setNewType(a.billingType ?? 'prepaid')
  }

  async function submit() {
    if (!selected || !panel) return
    setLoading(true); setMsg(null)
    try {
      let body: Record<string, unknown> = {}
      if (panel === 'type')  body = { billingType: newType }
      if (panel === 'topup') body = { type: 'topup', amount, expiresAt: expiry || undefined }
      if (panel === 'limit') body = { type: 'set_limit', creditLimit: amount }

      const res = await fetch(`/api/users/${selected.id}/balance`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ ok: false, text: data.error ?? 'Error' }); return }
      setMsg({ ok: true, text: 'Guardado correctamente' })
      setTimeout(() => { setPanel(null); window.location.reload() }, 800)
    } catch (e) {
      setMsg({ ok: false, text: String(e) })
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, email o ID…"
          className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Cliente / Reseller</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Reseller padre</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Facturación</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Saldo / Uso</th>
              <th className="text-right px-4 py-3 font-medium text-slate-600">Límite</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Sin resultados</td></tr>
            )}
            {filtered.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {roleBadge(a.role)}
                    <div>
                      <p className="font-medium text-slate-800">{a.name}</p>
                      <p className="text-xs text-slate-400">{a.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{a.parent?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  {a.billingType ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.billingType === 'prepaid' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                      {a.billingType === 'prepaid' ? 'Prepago' : 'Pospago'}
                    </span>
                  ) : <span className="text-slate-400 text-xs">Sin configurar</span>}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm">
                  {a.billingType === 'prepaid'  && <span className={`${(a.balance ?? 0) <= 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{fmt(a.balance)}</span>}
                  {a.billingType === 'postpaid' && <span className={`${(a.balance ?? 0) >= (a.creditLimit ?? Infinity) ? 'text-rose-600' : 'text-slate-700'}`}>{fmt(a.balance)} uso</span>}
                  {!a.billingType && <span className="text-slate-400">—</span>}
                </td>
                <td className="px-4 py-3 text-right font-mono text-sm">
                  {a.billingType === 'postpaid' ? fmt(a.creditLimit) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  {canManageBalance(a) && (
                    <button
                      onClick={() => openPanel(a, a.billingType === 'prepaid' ? 'topup' : a.billingType === 'postpaid' ? 'limit' : 'type')}
                      className="flex items-center gap-1 ml-auto px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {a.billingType === 'prepaid' ? <><Wallet className="w-3 h-3" /> Asignar saldo</> :
                       a.billingType === 'postpaid' ? <><CreditCard className="w-3 h-3" /> Ajustar límite</> :
                       <><ChevronRight className="w-3 h-3" /> Configurar</>}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Panel lateral */}
      {panel && selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setPanel(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">
                {panel === 'topup'  ? 'Asignar saldo'    :
                 panel === 'limit'  ? 'Ajustar límite'   :
                 'Configurar facturación'}
              </h2>
              <p className="text-sm text-slate-500">{selected.name}</p>
            </div>

            {panel === 'type' && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Tipo de facturación</label>
                <div className="flex gap-3">
                  {['prepaid', 'postpaid'].map((t) => (
                    <label key={t} className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-lg border-2 cursor-pointer transition-colors ${newType === t ? 'border-sky-500 bg-sky-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <input type="radio" checked={newType === t} onChange={() => setNewType(t)} className="sr-only" />
                      <span className="text-sm font-medium">{t === 'prepaid' ? 'Prepago' : 'Pospago'}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {panel === 'topup' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Monto a cargar (MXN)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" step="0.01" min="0.01" required value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-7 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Saldo actual: {fmt(selected.balance)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Vigencia <span className="text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            )}

            {panel === 'limit' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Límite de crédito (MXN)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                  <input type="number" step="0.01" min="0" required value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Uso actual: {fmt(selected.balance)} / Límite actual: {fmt(selected.creditLimit)}</p>
              </div>
            )}

            {msg && (
              <p className={`text-sm px-3 py-2 rounded-lg ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {msg.text}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={submit} disabled={loading}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Guardando…' : 'Guardar'}
              </button>
              <button onClick={() => setPanel(null)}
                className="px-4 py-2.5 border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
