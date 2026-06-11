'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'

type Row = {
  name: string
  sms: number
  whatsapp: number
  rcs: number
  total: number
  reseller?: string | null
  role?: string
}

const PERIODS = [
  { value: 'today', label: 'Hoy' },
  { value: 'week',  label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
  { value: 'custom', label: 'Personalizado' },
]

export function ConsumoChart({ role }: { role: string }) {
  const [data, setData] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('month')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [view, setView] = useState<'reseller' | 'client'>('reseller')

  useEffect(() => {
    load()
  }, [period, from, to, view])

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ period, view })
    if (period === 'custom' && from && to) { params.set('from', from); params.set('to', to) }
    const res = await fetch(`/api/reports/consumo?${params}`)
    if (res.ok) setData(await res.json())
    setLoading(false)
  }

  const total = data.reduce((s, r) => s + r.total, 0)
  const totalSms = data.reduce((s, r) => s + r.sms, 0)
  const totalWa  = data.reduce((s, r) => s + r.whatsapp, 0)
  const totalRcs = data.reduce((s, r) => s + r.rcs, 0)

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-200 overflow-hidden">
          {PERIODS.map((p) => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm transition-colors ${
                period === p.value ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}>
              {p.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm" />
            <span className="text-slate-400">—</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm" />
          </div>
        )}

        {role === 'admin' && (
          <div className="flex rounded-lg border border-slate-200 overflow-hidden ml-auto">
            <button onClick={() => setView('reseller')}
              className={`px-3 py-1.5 text-sm transition-colors ${view === 'reseller' ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              Por reseller
            </button>
            <button onClick={() => setView('client')}
              className={`px-3 py-1.5 text-sm transition-colors ${view === 'client' ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              Por cliente
            </button>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: total, color: 'text-slate-800' },
          { label: 'SMS', value: totalSms, color: 'text-sky-600' },
          { label: 'WhatsApp', value: totalWa, color: 'text-emerald-600' },
          { label: 'RCS', value: totalRcs, color: 'text-violet-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm gap-2">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            Cargando datos...
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
            Sin datos para el período seleccionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }}
                angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                formatter={(value, name) => [
                  Number(value).toLocaleString(),
                  name === 'sms' ? 'SMS' : name === 'whatsapp' ? 'WhatsApp' : 'RCS'
                ]}
              />
              <Legend formatter={(value) => value === 'sms' ? 'SMS' : value === 'whatsapp' ? 'WhatsApp' : 'RCS'} />
              <Bar dataKey="sms"      stackId="a" fill="#0ea5e9" radius={[0,0,0,0]} />
              <Bar dataKey="whatsapp" stackId="a" fill="#10b981" radius={[0,0,0,0]} />
              <Bar dataKey="rcs"      stackId="a" fill="#8b5cf6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Table */}
      {!loading && data.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Detalle</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-5 py-2.5 text-xs text-slate-500 font-medium">Nombre</th>
                {role === 'admin' && view === 'client' && (
                  <th className="text-left px-5 py-2.5 text-xs text-slate-500 font-medium">Reseller</th>
                )}
                <th className="text-right px-5 py-2.5 text-xs text-slate-500 font-medium">SMS</th>
                <th className="text-right px-5 py-2.5 text-xs text-slate-500 font-medium">WhatsApp</th>
                <th className="text-right px-5 py-2.5 text-xs text-slate-500 font-medium">RCS</th>
                <th className="text-right px-5 py-2.5 text-xs text-slate-500 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-5 py-2.5 font-medium text-slate-700">{r.name}</td>
                  {role === 'admin' && view === 'client' && (
                    <td className="px-5 py-2.5 text-slate-400 text-xs">{r.reseller ?? '—'}</td>
                  )}
                  <td className="px-5 py-2.5 text-right text-sky-600">{r.sms.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-right text-emerald-600">{r.whatsapp.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-right text-violet-600">{r.rcs.toLocaleString()}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-slate-700">{r.total.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td className="px-5 py-2.5 font-semibold text-slate-700" colSpan={role === 'admin' && view === 'client' ? 2 : 1}>Total</td>
                <td className="px-5 py-2.5 text-right font-semibold text-sky-600">{totalSms.toLocaleString()}</td>
                <td className="px-5 py-2.5 text-right font-semibold text-emerald-600">{totalWa.toLocaleString()}</td>
                <td className="px-5 py-2.5 text-right font-semibold text-violet-600">{totalRcs.toLocaleString()}</td>
                <td className="px-5 py-2.5 text-right font-semibold text-slate-700">{total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
