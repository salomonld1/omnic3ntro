'use client'

import { useState } from 'react'
import { UserCog, ArrowLeftCircle } from 'lucide-react'

export function ImpersonationBanner({
  adminName,
  userName,
}: {
  adminName: string
  userName: string
}) {
  const [loading, setLoading] = useState(false)

  async function handleReturn() {
    setLoading(true)
    await fetch('/api/auth/unimpersonate', { method: 'POST' })
    window.location.href = '/users'
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-400 text-amber-950 text-sm font-medium">
      <UserCog className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1">
        Estás viendo el portal como <strong>{userName}</strong>. Sesión iniciada por <strong>{adminName}</strong>.
      </span>
      <button
        onClick={handleReturn}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1 bg-amber-950 hover:bg-amber-900 text-amber-50 text-xs font-semibold rounded-md transition-colors disabled:opacity-60"
      >
        <ArrowLeftCircle className="w-3.5 h-3.5" />
        {loading ? 'Regresando...' : 'Volver a admin'}
      </button>
    </div>
  )
}
