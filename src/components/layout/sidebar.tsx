'use client'

import { useState } from 'react'
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
  PanelLeftClose,
  PanelLeftOpen,
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
  const [collapsed, setCollapsed] = useState(false)

  function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
          collapsed ? 'justify-center' : '',
          active
            ? 'bg-sky-600 text-white'
            : 'text-sky-100 hover:bg-sky-800 hover:text-white'
        )}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        {!collapsed && <span className="flex-1">{label}</span>}
        {!collapsed && active && <ChevronRight className="w-3 h-3" />}
      </Link>
    )
  }

  const navItems =
    role === 'admin' ? adminNavItems :
    role === 'reseller' ? resellerNavItems :
    userNavItems

  return (
    <div className={cn(
      'flex flex-col min-h-screen bg-sky-900 text-white transition-all duration-300',
      collapsed ? 'w-16' : 'w-64'
    )}>
      {/* Brand */}
      <div className={cn(
        'flex items-center border-b border-sky-800 transition-all duration-300',
        collapsed ? 'justify-center px-3 py-4' : 'justify-between px-4 py-4'
      )}>
        {!collapsed && <img src="/logo.png" alt="Omnic3ntro" className="h-9 w-auto mx-auto" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          className="p-1.5 rounded-lg text-sky-300 hover:bg-sky-800 hover:text-white transition-colors flex-shrink-0"
        >
          {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => <NavLink key={item.href} {...item} />)}

        {role === 'admin' && (
          <>
            {!collapsed && (
              <div className="pt-3 pb-1 px-3">
                <p className="text-xs font-semibold text-sky-400 uppercase tracking-wider">Admin</p>
              </div>
            )}
            {collapsed && <div className="pt-2 pb-1 border-t border-sky-800 mx-1" />}
            {adminSectionItems.map((item) => <NavLink key={item.href} {...item} />)}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-2 py-4 border-t border-sky-800">
        <form action={logout}>
          <button
            type="submit"
            title={collapsed ? 'Cerrar sesión' : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sky-100 hover:bg-sky-800 hover:text-white transition-colors w-full',
              collapsed ? 'justify-center' : ''
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && 'Cerrar sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}
