'use client'

import { useRouter } from 'next/navigation'

const ROLES = [
  { value: 'superadmin', label: 'Superadmin' },
  { value: 'admin',      label: 'Admin' },
  { value: 'reseller',   label: 'Reseller' },
  { value: 'account',    label: 'Account' },
  { value: 'user',       label: 'User' },
]

export function DevRoleSelector({ current }: { current: string }) {
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    document.cookie = `dev_role=${e.target.value}; path=/; max-age=86400`
    router.refresh()
  }

  return (
    <div className="w-full bg-amber-400 text-amber-900 text-xs font-semibold flex items-center justify-center gap-3 px-4 py-1.5 z-50">
      <span>⚙ DEV — Vista como:</span>
      <select
        defaultValue={current}
        onChange={handleChange}
        className="bg-amber-300 border border-amber-500 rounded px-2 py-0.5 text-amber-900 font-semibold cursor-pointer"
      >
        {ROLES.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
      <span className="opacity-60">(solo visible en desarrollo)</span>
    </div>
  )
}
