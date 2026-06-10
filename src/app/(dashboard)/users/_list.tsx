'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  UserPlus, Pencil, Trash2, Key, CheckCircle, XCircle,
  Shield, User, Users, LogIn, CreditCard, X, Plus, RotateCcw, Building2,
  ChevronsUpDown, ChevronUp, ChevronDown, History,
} from 'lucide-react'

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  parentId: string | null
  apiKey: string | null
  infobipBaseUrl: string | null
  infobipAppId: string | null
  pricePerMessage: number | null
  createdAt: string
  parent: { id: string; name: string; parentId: string | null } | null
  billingType: string | null
  balance: number | null
  balanceExpiresAt: string | null
  creditLimit: number | null
  alertAmount: number | null
  _count: { messages: number; campaigns: number; children: number }
}

type Reseller = { id: string; name: string }

const roleConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  admin:    { label: 'Admin',    color: 'bg-violet-100 text-violet-700', icon: Shield    },
  reseller: { label: 'Reseller', color: 'bg-amber-100 text-amber-700',   icon: Users     },
  client:   { label: 'Cliente',  color: 'bg-sky-100 text-sky-700',       icon: Building2 },
  user:     { label: 'Usuario',  color: 'bg-slate-100 text-slate-600',   icon: User      },
}

function getRoleLabel(u: UserRow) {
  if (u.role === 'user') {
    // Si su cliente padre NO está bajo un reseller → es un cliente directo → "Cliente"
    const underReseller = u.parent?.parentId != null
    return underReseller
      ? { label: 'Usuario', color: 'bg-slate-100 text-slate-600', icon: User }
      : { label: 'Cliente', color: 'bg-sky-100 text-sky-700',     icon: User }
  }
  return roleConfig[u.role] ?? roleConfig.user
}

function BillingModal({ user, onClose, onUpdate }: {
  user: UserRow
  onClose: () => void
  onUpdate: (updated: Partial<UserRow>) => void
}) {
  const [billingType, setBillingType] = useState(user.billingType ?? '')
  const [topupAmount, setTopupAmount] = useState('')
  const [topupExpiry, setTopupExpiry] = useState('')
  const [topupNote, setTopupNote] = useState('')
  const [newLimit, setNewLimit] = useState(user.creditLimit?.toString() ?? '')
  const [newAlert, setNewAlert] = useState(user.alertAmount?.toString() ?? '')
  const [loading, setLoading] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')

  const balance = user.balance ?? 0
  const creditLimit = user.creditLimit ?? 0

  async function post(body: Record<string, unknown>, section: string) {
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
      setTimeout(() => setSaved(null), 2500)
      const u = await fetch(`/api/users/${user.id}`).then((r) => r.json())
      onUpdate({
        billingType: u.billingType,
        balance: u.balance,
        balanceExpiresAt: u.balanceExpiresAt,
        creditLimit: u.creditLimit,
      })
      setBillingType(u.billingType ?? '')
      setNewLimit(u.creditLimit?.toString() ?? '')
      setTopupAmount('')
      setTopupExpiry('')
      setTopupNote('')
    } finally {
      setLoading(null)
    }
  }

  async function changeBillingType(type: string) {
    setBillingType(type)
    await post({ billingType: type }, 'type')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="font-semibold text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tipo de facturación</p>
            {user.billingType ? (
              <span className={`inline-flex px-3 py-1.5 rounded-lg text-xs font-medium border ${
                user.billingType === 'prepaid'
                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                  : 'bg-violet-50 text-violet-700 border-violet-200'
              }`}>
                {user.billingType === 'prepaid' ? 'Prepago' : 'Postpago'}
              </span>
            ) : (
              <div className="flex gap-2">
                {[
                  { value: 'prepaid', label: 'Prepago' },
                  { value: 'postpaid', label: 'Postpago' },
                ].map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => changeBillingType(opt.value)}
                    disabled={loading === 'type'}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-white text-slate-600 border-slate-300 hover:border-sky-400 transition-colors disabled:opacity-50">
                    {opt.label}
                  </button>
                ))}
                {saved === 'type' && <span className="text-xs text-emerald-600 self-center">✓</span>}
              </div>
            )}
          </div>

          {billingType === 'prepaid' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-xl px-4 py-3 ${balance <= 0 ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <p className="text-xs text-slate-500 mb-0.5">Saldo disponible</p>
                  <p className={`text-lg font-bold ${balance <= 0 ? 'text-rose-600' : 'text-emerald-700'}`}>${balance.toFixed(2)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-0.5">Vigencia</p>
                  <p className={`text-sm font-semibold ${
                    user.balanceExpiresAt && new Date(user.balanceExpiresAt) < new Date() ? 'text-rose-500' : 'text-slate-700'
                  }`}>
                    {user.balanceExpiresAt
                      ? new Date(user.balanceExpiresAt).toLocaleDateString('es-MX')
                      : '—'}
                  </p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-600" /> Agregar saldo
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" step="0.01" min="0.01" value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="500.00"
                      className="w-full pl-6 pr-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <input type="date" value={topupExpiry}
                    onChange={(e) => setTopupExpiry(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                </div>
                <input
                  type="text"
                  value={topupNote}
                  onChange={(e) => setTopupNote(e.target.value)}
                  placeholder="Nota (requerido) — ej: Pago factura #123"
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                <button
                  onClick={() => topupAmount && topupNote.trim() && post({ type: 'topup', amount: topupAmount, note: topupNote.trim(), expiresAt: topupExpiry || undefined }, 'topup')}
                  disabled={loading === 'topup' || !topupAmount || !topupNote.trim()}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                  {loading === 'topup' ? 'Guardando...' : saved === 'topup' ? '✓ Recargado' : 'Recargar saldo'}
                </button>
              </div>
            </div>
          )}

          {billingType === 'postpaid' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-0.5">Crédito autorizado</p>
                  <p className="text-lg font-bold text-slate-800">
                    {creditLimit > 0 ? `$${creditLimit.toFixed(2)}` : <span className="text-slate-400 text-sm">Sin límite</span>}
                  </p>
                </div>
                <div className={`rounded-xl px-4 py-3 border ${creditLimit > 0 && balance >= creditLimit ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                  <p className="text-xs text-slate-500 mb-0.5">Uso acumulado</p>
                  <p className={`text-lg font-bold ${creditLimit > 0 && balance >= creditLimit * 0.9 ? 'text-rose-600' : 'text-slate-800'}`}>
                    ${balance.toFixed(2)}
                  </p>
                </div>
              </div>

              {creditLimit > 0 && (
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${balance >= creditLimit ? 'bg-rose-500' : balance >= creditLimit * 0.8 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, (balance / creditLimit) * 100)}%` }}
                  />
                </div>
              )}

              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Límite de crédito (MXN)</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" step="0.01" min="0" value={newLimit}
                      onChange={(e) => setNewLimit(e.target.value)}
                      placeholder="1000.00"
                      className="w-full pl-6 pr-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <button
                    onClick={() => newLimit !== '' && post({ type: 'set_limit', creditLimit: newLimit }, 'limit')}
                    disabled={loading === 'limit' || newLimit === ''}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                    {loading === 'limit' ? '...' : saved === 'limit' ? '✓' : 'Guardar'}
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-600">Alerta de saldo (MXN)</p>
                <p className="text-xs text-slate-400">Se enviará un email cuando el uso supere este monto.</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" step="0.01" min="0" value={newAlert}
                      onChange={(e) => setNewAlert(e.target.value)}
                      placeholder="500.00"
                      className="w-full pl-6 pr-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
                  </div>
                  <button
                    onClick={() => newAlert !== '' && post({ type: 'set_alert', alertAmount: newAlert }, 'alert')}
                    disabled={loading === 'alert' || newAlert === ''}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap">
                    {loading === 'alert' ? '...' : saved === 'alert' ? '✓' : 'Guardar'}
                  </button>
                </div>
              </div>

              <button
                onClick={() => balance > 0 && confirm('¿Confirmar que la deuda fue saldada?') && post({ type: 'reset_debt' }, 'reset')}
                disabled={loading === 'reset' || balance === 0}
                className="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 hover:border-amber-400 hover:text-amber-600 text-slate-500 text-sm rounded-lg transition-colors disabled:opacity-40">
                <RotateCcw className="w-3.5 h-3.5" />
                {saved === 'reset' ? '✓ Deuda saldada' : 'Marcar deuda como saldada'}
              </button>
            </div>
          )}

          {error && <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 px-3 py-2 rounded-lg">{error}</p>}
        </div>
      </div>
    </div>
  )
}

type SortKey = 'name' | 'role' | 'parent' | 'balance' | 'messages'
type SortDir = 'asc' | 'desc'

function sortUsers(users: UserRow[], key: SortKey, dir: SortDir) {
  return [...users].sort((a, b) => {
    let av: string | number = 0
    let bv: string | number = 0
    if (key === 'name')     { av = a.name.toLowerCase(); bv = b.name.toLowerCase() }
    if (key === 'role')     { av = a.role; bv = b.role }
    if (key === 'parent')   { av = a.parent?.name.toLowerCase() ?? ''; bv = b.parent?.name.toLowerCase() ?? '' }
    if (key === 'balance')  { av = a.balance ?? -Infinity; bv = b.balance ?? -Infinity }
    if (key === 'messages') { av = a._count.messages; bv = b._count.messages }
    if (av < bv) return dir === 'asc' ? -1 : 1
    if (av > bv) return dir === 'asc' ?  1 : -1
    return 0
  })
}

export function UserList({
  initialUsers,
  resellers,
  viewerRole,
}: {
  initialUsers: UserRow[]
  resellers: Reseller[]
  viewerRole: string
}) {
  const [users, setUsers] = useState<UserRow[]>(initialUsers)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [impersonating, setImpersonating] = useState<string | null>(null)
  const [billingUser, setBillingUser] = useState<UserRow | null>(null)
  const [filter, setFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  async function handleImpersonate(id: string) {
    setImpersonating(id)
    try {
      const res = await fetch(`/api/users/${id}/impersonate`, { method: 'POST' })
      if (res.ok) {
        window.location.href = '/dashboard'
      } else {
        const data = await res.json()
        alert(data.error ?? 'Error al entrar como usuario')
      }
    } finally {
      setImpersonating(null)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar "${name}"? Esta acción no se puede deshacer.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id))
      } else {
        const data = await res.json()
        alert(data.error ?? 'Error al eliminar')
      }
    } finally {
      setDeleting(null)
    }
  }

  function handleBillingUpdate(id: string, updated: Partial<UserRow>) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ...updated } : u))
    if (billingUser?.id === id) setBillingUser((prev) => prev ? { ...prev, ...updated } : null)
  }

  const filtered = sortUsers(
    users.filter((u) => {
      const matchText =
        !filter ||
        u.name.toLowerCase().includes(filter.toLowerCase()) ||
        u.email.toLowerCase().includes(filter.toLowerCase())
      const matchRole = roleFilter === 'all' || u.role === roleFilter
      return matchText && matchRole
    }),
    sortKey,
    sortDir,
  )

  const newLabel =
    viewerRole === 'reseller' ? 'Nuevo cliente' :
    viewerRole === 'client'   ? 'Nuevo usuario' :
    'Nuevo'

  const showParentCol = viewerRole === 'admin'
  const showBillingBtn = (u: UserRow) => u.role === 'client'

  return (
    <div>
      {billingUser && (
        <BillingModal
          user={billingUser}
          onClose={() => setBillingUser(null)}
          onUpdate={(updated) => handleBillingUpdate(billingUser.id, updated)}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-6">
        <input
          type="search"
          placeholder="Buscar por nombre o email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 max-w-xs px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
        />
        {viewerRole === 'admin' && (
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
          >
            <option value="all">Todos los roles</option>
            <option value="admin">Admin</option>
            <option value="reseller">Reseller</option>
            <option value="client">Cliente</option>
            <option value="user">Usuario</option>
          </select>
        )}
        <span className="text-sm text-slate-500 ml-auto">{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
        <Link
          href="/users/new"
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          {newLabel}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            {users.length === 0
              ? <><p className="mb-2">No hay registros todavía.</p><Link href="/users/new" className="text-sky-600 hover:underline">Crea el primero</Link></>
              : 'Ningún resultado para esa búsqueda.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {(
                  [
                    { key: 'name' as SortKey,     label: 'Nombre',        className: 'px-5 py-3' },
                    { key: 'role' as SortKey,     label: 'Rol',           className: 'px-5 py-3' },
                  ]
                ).map(({ key, label, className }) => (
                  <th key={key} className={className}>
                    <button
                      onClick={() => handleSort(key)}
                      className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-800 transition-colors"
                    >
                      {label}
                      {sortKey === key
                        ? sortDir === 'asc'
                          ? <ChevronUp className="w-3.5 h-3.5 text-sky-500" />
                          : <ChevronDown className="w-3.5 h-3.5 text-sky-500" />
                        : <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />}
                    </button>
                  </th>
                ))}
                {showParentCol && (
                  <th className="px-5 py-3 hidden lg:table-cell">
                    <button onClick={() => handleSort('parent')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-800 transition-colors">
                      Superior
                      {sortKey === 'parent' ? sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-sky-500" /> : <ChevronDown className="w-3.5 h-3.5 text-sky-500" /> : <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />}
                    </button>
                  </th>
                )}
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Conector</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">App ID</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Precio/msg</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">API Key</th>
                <th className="px-5 py-3 hidden md:table-cell">
                  <button onClick={() => handleSort('balance')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-800 transition-colors">
                    Saldo / Límite
                    {sortKey === 'balance' ? sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-sky-500" /> : <ChevronDown className="w-3.5 h-3.5 text-sky-500" /> : <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3 hidden xl:table-cell">
                  <button onClick={() => handleSort('messages')} className="flex items-center gap-1 text-xs font-semibold text-slate-500 uppercase tracking-wide hover:text-slate-800 transition-colors">
                    Actividad
                    {sortKey === 'messages' ? sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-sky-500" /> : <ChevronDown className="w-3.5 h-3.5 text-sky-500" /> : <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />}
                  </button>
                </th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => {
                const rl = getRoleLabel(u)
                const RoleIcon = rl.icon
                const prepaidWarn = u.billingType === 'prepaid' && (
                  (u.balanceExpiresAt && new Date(u.balanceExpiresAt) < new Date()) ||
                  !u.balance || u.balance <= 0
                )
                const postpaidOver = u.billingType === 'postpaid' && u.creditLimit != null && (u.balance ?? 0) >= u.creditLimit

                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${rl.color}`}>
                        <RoleIcon className="w-3 h-3" />
                        {rl.label}
                      </span>
                      {(u.role === 'reseller' || u.role === 'client') && u._count.children > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {u._count.children} {u.role === 'reseller' ? 'clientes' : 'usuarios'}
                        </p>
                      )}
                    </td>
                    {showParentCol && (
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        {u.parent ? (
                          <Link href={`/users/${u.parent.id}`} className="text-sky-600 hover:underline text-xs">{u.parent.name}</Link>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {u.infobipBaseUrl ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                          <CheckCircle className="w-3.5 h-3.5" /> Configurado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 text-xs">
                          <XCircle className="w-3.5 h-3.5" /> Sin configurar
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {u.infobipAppId ? (
                        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                          {u.infobipAppId}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {u.pricePerMessage != null ? (
                        <span className="font-mono text-xs text-slate-700">${u.pricePerMessage.toFixed(4)}</span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {u.apiKey ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                          <Key className="w-3.5 h-3.5" /> Activa
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Saldo / Límite — solo aplica a clientes (role='client') */}
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      {u.billingType === 'prepaid' && (
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${prepaidWarn ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'}`}>
                            Prepago
                          </span>
                          <p className={`text-xs mt-0.5 font-semibold ${prepaidWarn ? 'text-rose-500' : 'text-slate-700'}`}>
                            ${(u.balance ?? 0).toFixed(2)} MXN
                          </p>
                          {u.balanceExpiresAt && (
                            <p className="text-xs text-slate-400">
                              Vence {new Date(u.balanceExpiresAt).toLocaleDateString('es-MX')}
                            </p>
                          )}
                        </div>
                      )}
                      {u.billingType === 'postpaid' && (
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${postpaidOver ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-700'}`}>
                            Postpago
                          </span>
                          <p className={`text-xs mt-0.5 font-semibold ${postpaidOver ? 'text-rose-500' : 'text-slate-700'}`}>
                            ${(u.balance ?? 0).toFixed(2)}
                            {u.creditLimit != null && (
                              <span className="font-normal text-slate-400"> / ${u.creditLimit.toFixed(2)}</span>
                            )}
                          </p>
                        </div>
                      )}
                      {!u.billingType && <span className="text-slate-400 text-xs">—</span>}
                    </td>

                    <td className="px-5 py-3.5 hidden xl:table-cell">
                      <span className="text-slate-600">{u._count.messages.toLocaleString()}</span>
                      <span className="text-slate-400 ml-1 text-xs">msgs</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 justify-end">
                        {viewerRole === 'admin' && u.role !== 'admin' && (
                          <button
                            onClick={() => handleImpersonate(u.id)}
                            disabled={impersonating === u.id}
                            className="p-1.5 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                            title="Entrar como este usuario"
                          >
                            <LogIn className="w-4 h-4" />
                          </button>
                        )}
                        {(u.role === 'client' || u.role === 'reseller') && (
                          <Link
                            href={`/users/${u.id}/transactions`}
                            className="p-1.5 rounded-md text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                            title="Historial de transacciones"
                          >
                            <History className="w-4 h-4" />
                          </Link>
                        )}
                        {showBillingBtn(u) && (
                          <button
                            onClick={() => setBillingUser(u)}
                            className={`p-1.5 rounded-md transition-colors ${
                              u.billingType
                                ? prepaidWarn || postpaidOver
                                  ? 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'
                                  : 'text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50'
                                : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50'
                            }`}
                            title="Facturación / Límites"
                          >
                            <CreditCard className="w-4 h-4" />
                          </button>
                        )}
                        <Link
                          href={`/users/${u.id}`}
                          className="p-1.5 rounded-md text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          disabled={deleting === u.id}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}
