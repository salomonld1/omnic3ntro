'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  MessageSquare,
  MessageCircle,
  Smartphone,
  Users,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  UserCog,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { logout } from '@/app/actions/auth'

const userNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/sms', label: 'SMS', icon: MessageSquare },
  { href: '/whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { href: '/rcs', label: 'RCS', icon: Smartphone },
  { href: '/contacts', label: 'Contactos', icon: Users },
  { href: '/templates', label: 'Plantillas', icon: FileText },
  { href: '/reports', label: 'Reportes', icon: BarChart3 },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

const resellerNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/users', label: 'Mis Clientes', icon: Users },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

const adminNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

const adminSectionItems = [
  { href: '/users', label: 'Usuarios', icon: UserCog },
]

interface SidebarProps {
  role: string
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          active
            ? 'bg-sky-600 text-white'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">{label}</span>
        {active && <ChevronRight className="w-3 h-3" />}
      </Link>
    )
  }

  const navItems =
    role === 'admin' ? adminNavItems :
    role === 'reseller' ? resellerNavItems :
    userNavItems

  return (
    <div className="flex flex-col w-64 min-h-screen bg-slate-900 text-white">
      {/* Brand */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-700">
        <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center font-bold text-sm">
          O3
        </div>
        <div>
          <p className="font-semibold text-sm leading-tight">Omnic3ntro</p>
          <p className="text-xs text-slate-400">Messaging Platform</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => <NavLink key={item.href} {...item} />)}

        {role === 'admin' && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</p>
            </div>
            {adminSectionItems.map((item) => <NavLink key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-700">
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}
