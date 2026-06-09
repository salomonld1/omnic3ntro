'use client'

import { useState } from 'react'
import { Save, Key, User, Bell } from 'lucide-react'

export function SettingsForm() {
  const [infobip, setInfobip] = useState({ apiKey: '', baseUrl: '' })
  const [profile, setProfile] = useState({ name: '', email: '', password: '' })
  const [saved, setSaved] = useState<string | null>(null)

  async function saveInfobip(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/settings/infobip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(infobip),
    })
    if (res.ok) { setSaved('infobip'); setTimeout(() => setSaved(null), 3000) }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/settings/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    if (res.ok) { setSaved('profile'); setTimeout(() => setSaved(null), 3000) }
  }

  return (
    <div className="space-y-6">
      {/* Infobip */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Key className="w-5 h-5 text-sky-600" />
          <h2 className="font-semibold text-slate-800">Credenciales Infobip</h2>
        </div>
        <p className="text-sm text-slate-500 mb-4">Estas credenciales son internas. Tus clientes nunca las verán.</p>
        <form onSubmit={saveInfobip} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">API Key</label>
            <input type="password" value={infobip.apiKey} onChange={(e) => setInfobip({ ...infobip, apiKey: e.target.value })}
              placeholder="Tu API Key de Infobip"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Base URL</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 border border-r-0 border-slate-300 rounded-l-lg bg-slate-50 text-slate-500 text-sm">https://</span>
              <input type="text" value={infobip.baseUrl} onChange={(e) => setInfobip({ ...infobip, baseUrl: e.target.value })}
                placeholder="xxxxxx.api.infobip.com"
                className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-r-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Save className="w-4 h-4" /> Guardar credenciales
            </button>
            {saved === 'infobip' && <span className="text-sm text-emerald-600">✓ Guardado</span>}
          </div>
        </form>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <User className="w-5 h-5 text-sky-600" />
          <h2 className="font-semibold text-slate-800">Perfil</h2>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre</label>
            <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Tu nombre"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
            <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="tu@empresa.com"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Nueva contraseña</label>
            <input type="password" value={profile.password} onChange={(e) => setProfile({ ...profile, password: e.target.value })} placeholder="Dejar vacío para no cambiar"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent" />
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors">
              <Save className="w-4 h-4" /> Guardar perfil
            </button>
            {saved === 'profile' && <span className="text-sm text-emerald-600">✓ Guardado</span>}
          </div>
        </form>
      </div>

      {/* Webhooks */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Bell className="w-5 h-5 text-sky-600" />
          <h2 className="font-semibold text-slate-800">Webhooks</h2>
        </div>
        <p className="text-sm text-slate-500">
          Configura una URL de webhook para recibir reportes de entrega en tiempo real.
          <span className="text-sky-600 ml-1">(Próximamente)</span>
        </p>
      </div>
    </div>
  )
}
