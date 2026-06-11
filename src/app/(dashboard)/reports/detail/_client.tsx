'use client'

import { useState, useEffect } from 'react'
import { Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Badge, statusVariant } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'

type Message = {
  id: string; to: string; content: string; channel: string; status: string
  cost: number | null; createdAt: string; sentAt: string | null
  user: { id: string; name: string }
  campaign: { name: string } | null
}

type Option = { id: string; name: string }

const PERIODS = [
  { value: 'today', label: 'Hoy' },
  { value: 'week',  label: 'Última semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'custom', label: 'Personalizado' },
]
const CHANNELS = [
  { value: '', label: 'Todos los canales' },
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'rcs', label: 'RCS' },
]

const channelBadge: Record<string, string> = {
  sms: 'bg-sky-100 text-sky-700',
  whatsapp: 'bg-emerald-100 text-emerald-700',
  rcs: 'bg-violet-100 text-violet-700',
}

export function ReportDetailClient({ viewerRole, resellers, clients }: {
  viewerRole: string
  resellers: Option[]
  clients: Option[]
}) {
  const [filters, setFilters] = useState({ period: 'week', from: '', to: '', channel: '', resellerId: '', userId: '' })
  const [messages, setMessages] = useState<Message[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  function buildParams(extra?: Record<string, string>) {
    const p = new URLSearchParams()
    Object.entries({ ...filters, page: String(page), ...extra }).forEach(([k, v]) => { if (v) p.set(k, v) })
    return p.toString()
  }

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/reports/detail?${buildParams()}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data.messages)
      setTotal(data.total)
      setPages(data.pages)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [filters, page])

  function changeFilters(newFilters: typeof filters) {
    setPage(1)
    setFilters(newFilters)
  }

  function exportCsv() {
    window.open(`/api/reports/detail?${buildParams({ format: 'csv', page: '1' })}`)
  }

  function exportXlsx() {
    window.open(`/api/reports/detail?${buildParams({ format: 'xlsx', page: '1' })}`)
  }

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filtros</p>
          <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Período</label>
            <select value={filters.period} onChange={(e) => changeFilters({ ...filters, period: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
              {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {filters.period === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
                <input type="date" value={filters.from} onChange={(e) => changeFilters({ ...filters, from: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
                <input type="date" value={filters.to} onChange={(e) => changeFilters({ ...filters, to: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Canal</label>
            <select value={filters.channel} onChange={(e) => changeFilters({ ...filters, channel: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
              {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {viewerRole === 'admin' && resellers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Distribuidor</label>
              <select value={filters.resellerId} onChange={(e) => changeFilters({ ...filters, resellerId: e.target.value, userId: '' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="">Todos</option>
                {resellers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}

          {(viewerRole === 'admin' || viewerRole === 'reseller') && clients.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Cliente</label>
              <select value={filters.userId} onChange={(e) => changeFilters({ ...filters, userId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="">Todos</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="font-semibold text-slate-800 text-sm">{total.toLocaleString()} mensajes</p>
          <div className="flex gap-2">
            <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Actualizar
            </button>
            <button onClick={exportCsv} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-sky-600 border border-sky-200 rounded-lg hover:bg-sky-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
            <button onClick={exportXlsx} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors">
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">Cargando...</div>
        ) : messages.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">Sin mensajes para el período seleccionado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fecha</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Destinatario</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Canal</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                  {(viewerRole === 'admin' || viewerRole === 'reseller') && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuario</th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Campaña</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Costo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden xl:table-cell">Mensaje</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {messages.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(new Date(m.createdAt))}</td>
                    <td className="px-4 py-3 font-mono text-slate-700 text-xs">{m.to}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${channelBadge[m.channel] ?? 'bg-slate-100 text-slate-600'}`}>
                        {m.channel.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3"><Badge variant={statusVariant(m.status)}>{m.status}</Badge></td>
                    {(viewerRole === 'admin' || viewerRole === 'reseller') && (
                      <td className="px-4 py-3 text-slate-600 text-xs">{m.user.name}</td>
                    )}
                    <td className="px-4 py-3 text-slate-400 text-xs hidden lg:table-cell">{m.campaign?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-700 text-xs font-mono">
                      {m.cost != null ? `$${m.cost.toFixed(4)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate hidden xl:table-cell">{m.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {pages > 1 && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">Página {page} de {pages} · {total.toLocaleString()} mensajes</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
                className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
