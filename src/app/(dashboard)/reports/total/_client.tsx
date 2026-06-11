'use client'

import { useState, useEffect } from 'react'
import { Download, RefreshCw } from 'lucide-react'

type ReportRow = {
  id: string; name: string; email: string; role: string; reseller: string | null
  total: number; sent: number; delivered: number; failed: number
  bySms: number; byWa: number; byRcs: number
  pricePerMessage: number | null; cost: number | null
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

export function ReportTotalClient({ viewerRole, resellers, clients }: {
  viewerRole: string
  resellers: Option[]
  clients: Option[]
}) {
  const [filters, setFilters] = useState({ period: 'week', from: '', to: '', channel: '', resellerId: '', userId: '' })
  const [rows, setRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)

  function buildParams(extra?: Record<string, string>) {
    const p = new URLSearchParams()
    Object.entries({ ...filters, ...extra }).forEach(([k, v]) => { if (v) p.set(k, v) })
    return p.toString()
  }

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/reports/total?${buildParams()}`)
    if (res.ok) setRows(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [filters])

  function exportCsv() {
    window.open(`/api/reports/total?${buildParams({ format: 'csv' })}`)
  }

  function exportXlsx() {
    window.open(`/api/reports/total?${buildParams({ format: 'xlsx' })}`)
  }

  const totalMsgs = rows.reduce((s, r) => s + r.total, 0)
  const totalCost = rows.reduce((s, r) => s + (r.cost ?? 0), 0)

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
            <select value={filters.period} onChange={(e) => setFilters({ ...filters, period: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
              {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>

          {filters.period === 'custom' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Desde</label>
                <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Hasta</label>
                <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500" />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Canal</label>
            <select value={filters.channel} onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
              {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          {viewerRole === 'admin' && resellers.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Distribuidor</label>
              <select value={filters.resellerId} onChange={(e) => setFilters({ ...filters, resellerId: e.target.value, userId: '' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="">Todos</option>
                {resellers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          )}

          {(viewerRole === 'admin' || viewerRole === 'reseller') && clients.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Cliente</label>
              <select value={filters.userId} onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500">
                <option value="">Todos</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total mensajes', value: totalMsgs.toLocaleString(), color: 'sky' },
          { label: 'Enviados', value: rows.reduce((s, r) => s + r.sent, 0).toLocaleString(), color: 'emerald' },
          { label: 'Fallidos', value: rows.reduce((s, r) => s + r.failed, 0).toLocaleString(), color: 'rose' },
          { label: 'Costo total', value: `$${totalCost.toFixed(2)}`, color: 'amber' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs text-slate-500 mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-slate-800">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="font-semibold text-slate-800 text-sm">{rows.length} usuarios</p>
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
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">Sin datos para el período seleccionado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuario</th>
                  {viewerRole === 'admin' && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Distribuidor</th>}
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">SMS</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">WA</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">RCS</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Entregados</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Fallidos</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Precio/msg</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Costo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{r.name}</p>
                      <p className="text-xs text-slate-400">{r.email}</p>
                    </td>
                    {viewerRole === 'admin' && <td className="px-4 py-3 text-slate-500 text-xs">{r.reseller ?? '—'}</td>}
                    <td className="px-4 py-3 text-right text-slate-700">{r.bySms.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{r.byWa.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{r.byRcs.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-800">{r.total.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{r.delivered.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-rose-500">{r.failed.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-500 text-xs">
                      {r.pricePerMessage != null ? `$${r.pricePerMessage.toFixed(4)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {r.cost != null ? `$${r.cost.toFixed(2)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
