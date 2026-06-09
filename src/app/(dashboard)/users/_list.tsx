'use client'

import { useState } from 'react'
import Link from 'next/link'
import { UserPlus, Pencil, Trash2, Key, CheckCircle, XCircle, Shield, User, Users, LogIn } from 'lucide-react'

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  parentId: string | null
  apiKey: string | null
  infobipBaseUrl: string | null
  createdAt: string
  parent: { id: string; name: string } | null
  _count: { messages: number; campaigns: number; children: number }
}

type Reseller = { id: string; name: string }

const roleLabel: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  admin:    { label: 'Admin',    color: 'bg-violet-100 text-violet-700', icon: Shield },
  reseller: { label: 'Reseller', color: 'bg-amber-100 text-amber-700',   icon: Users },
  user:     { label: 'Usuario',  color: 'bg-slate-100 text-slate-600',   icon: User  },
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
  const [filter, setFilter] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar al usuario "${name}"? Esta acción no se puede deshacer.`)) return
    setDeleting(id)
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id))
      } else {
        const data = await res.json()
        alert(data.error ?? 'Error al eliminar usuario')
      }
    } finally {
      setDeleting(null)
    }
  }

  const filtered = users.filter((u) => {
    const matchText =
      !filter ||
      u.name.toLowerCase().includes(filter.toLowerCase()) ||
      u.email.toLowerCase().includes(filter.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchText && matchRole
  })

  return (
    <div>
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
            <option value="user">Usuario</option>
          </select>
        )}
        <span className="text-sm text-slate-500 ml-auto">{filtered.length} usuario{filtered.length !== 1 ? 's' : ''}</span>
        <Link
          href="/users/new"
          className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          {viewerRole === 'reseller' ? 'Nuevo cliente' : 'Nuevo usuario'}
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            {users.length === 0
              ? <><p className="mb-2">No hay usuarios todavía.</p><Link href="/users/new" className="text-sky-600 hover:underline">Crea el primero</Link></>
              : 'Ningún resultado para esa búsqueda.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuario</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Rol</th>
                {viewerRole === 'admin' && (
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Reseller</th>
                )}
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Infobip</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">API Key</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Actividad</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => {
                const rl = roleLabel[u.role] ?? roleLabel.user
                const RoleIcon = rl.icon
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
                      {u.role === 'reseller' && u._count.children > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5">{u._count.children} clientes</p>
                      )}
                    </td>
                    {viewerRole === 'admin' && (
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
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {u.apiKey ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs">
                          <Key className="w-3.5 h-3.5" /> Activa
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 hidden xl:table-cell">
                      <span className="text-slate-600">{u._count.messages.toLocaleString()}</span>
                      <span className="text-slate-400 ml-1 text-xs">msgs</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 justify-end">
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
        )}
      </div>
    </div>
  )
}
