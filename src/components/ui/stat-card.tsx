import { cn, formatNumber } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; positive: boolean }
  color?: 'sky' | 'emerald' | 'amber' | 'rose' | 'violet'
}

const colorMap = {
  sky: 'bg-sky-50 text-sky-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  violet: 'bg-violet-50 text-violet-600',
}

export function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'sky' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', colorMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-500 truncate">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        {trend && (
          <p className={cn('text-xs font-medium mt-1', trend.positive ? 'text-emerald-600' : 'text-rose-500')}>
            {trend.positive ? '▲' : '▼'} {Math.abs(trend.value)}% vs mes anterior
          </p>
        )}
      </div>
    </div>
  )
}
