import { cn } from '@/lib/utils'

const variants: Record<string, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  info: 'bg-sky-100 text-sky-700',
  sms: 'bg-sky-100 text-sky-700',
  whatsapp: 'bg-emerald-100 text-emerald-700',
  rcs: 'bg-violet-100 text-violet-700',
}

interface BadgeProps {
  children: React.ReactNode
  variant?: keyof typeof variants
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

export function statusVariant(status: string): keyof typeof variants {
  const map: Record<string, keyof typeof variants> = {
    delivered: 'success',
    sent: 'info',
    pending: 'warning',
    failed: 'danger',
    active: 'success',
    draft: 'default',
    completed: 'success',
  }
  return map[status.toLowerCase()] ?? 'default'
}
