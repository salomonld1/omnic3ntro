import { getSession } from '@/lib/auth'
import { Bell, Search } from 'lucide-react'

interface HeaderProps {
  title: string
}

export async function Header({ title }: HeaderProps) {
  const session = await getSession()

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between flex-shrink-0">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>

      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Search className="w-4 h-4" />
        </button>
        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors relative">
          <Bell className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 pl-4 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center text-white text-sm font-medium">
            {session?.name?.charAt(0).toUpperCase() ?? 'U'}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-700">{session?.name}</p>
            <p className="text-xs text-slate-400">{session?.role}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
