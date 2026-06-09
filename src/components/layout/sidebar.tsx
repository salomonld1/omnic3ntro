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
  List,
  Settings,
  LogOut,
  ChevronRight,
  ChevronDown,
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
]

const userNavItemsBottom = [
  { href: '/contacts', label: 'Contactos', icon: Users },
  { href: '/templates', label: 'Plantillas', icon: FileText },
  { href: '/settings', label: 'Configuración', icon: Settings },
]

const reportNavItems = [
  { href: '/reports/total',   label: 'Reporte Total',   icon: List },
  { href: '/reports/detail',  label: 'Reporte Detalle', icon: List },
  { href: '/reports/consumo', label: 'Gráfico consumo', icon: BarChart3 },
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
  const inReports = pathname.startsWith('/reports')
  const [reportsOpen, setReportsOpen] = useState(inReports)

  function NavLink({ href, label, icon: Icon, sub = false }: { href: string; label: string; icon: React.ElementType; sub?: boolean }) {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={cn(
          'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
          collapsed ? 'justify-center' : '',
          sub && !collapsed ? 'pl-8 text-xs' : '',
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

  const navItemsBottom = role === 'user' ? userNavItemsBottom : []

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

        {/* Reportes — collapsible (for user role goes between RCS and Contacts) */}
        <div>
          <button
            onClick={() => !collapsed && setReportsOpen((o) => !o)}
            title={collapsed ? 'Reportes' : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full',
              collapsed ? 'justify-center' : '',
              inReports ? 'text-white' : 'text-sky-100 hover:bg-sky-800 hover:text-white'
            )}
          >
            <BarChart3 className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="flex-1 text-left">Reportes</span>}
            {!collapsed && (
              reportsOpen
                ? <ChevronDown className="w-3.5 h-3.5" />
                : <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Sub-items */}
          {(reportsOpen || collapsed) && (
            <div className={cn('space-y-0.5', !collapsed && 'mt-0.5')}>
              {reportNavItems.map((item) => (
                <NavLink key={item.href} {...item} sub />
              ))}
            </div>
          )}
        </div>

        {navItemsBottom.map((item) => <NavLink key={item.href} {...item} />)}

        {role === 'admin' && adminSectionItems.map((item) => <NavLink key={item.href} {...item} />)}
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
