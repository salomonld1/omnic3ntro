import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getEffectiveRole } from '@/lib/dev-role'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { MessageSquare, MessageCircle, Smartphone } from 'lucide-react'
import type { PricingMap } from '@/lib/billing'

function fmt(n: number | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 4 }).format(n)
}

function Row({ label, value }: { label: string; value: number | undefined }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="py-3 px-4 text-sm text-slate-600">{label}</td>
      <td className="py-3 px-4 text-sm font-semibold text-slate-800 text-right font-mono">
        {value != null ? <>{fmt(value)} <span className="text-xs text-slate-400 font-normal">/ msg</span></> : '—'}
      </td>
    </tr>
  )
}

function Channel({ icon: Icon, title, color, children }: {
  icon: React.ElementType; title: string; color: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 ${color}`}>
        <Icon className="w-4 h-4" />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <table className="w-full">{children}</table>
    </div>
  )
}

export default async function PricingPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const effectiveRole = await getEffectiveRole(session.role)
  const isAccount = effectiveRole === 'account' || effectiveRole === 'client'
  if (!isAccount) redirect('/dashboard')

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { pricing: true, billingType: true, balance: true, creditLimit: true },
  })

  const pricing: PricingMap = (() => {
    try { return user?.pricing ? JSON.parse(user.pricing) : {} } catch { return {} }
  })()

  const hasPricing = Object.keys(pricing).length > 0

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Mis Tarifas" />
      <main className="flex-1 p-6 max-w-2xl space-y-6">

        {/* Tipo de plan */}
        {user?.billingType && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-4">
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Tipo de plan</p>
              <p className="text-lg font-semibold text-slate-800 mt-0.5">
                {user.billingType === 'prepaid' ? 'Prepago' : 'Pospago'}
              </p>
            </div>
            <div className="border-l border-slate-200 pl-4">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                {user.billingType === 'prepaid' ? 'Saldo disponible' : 'Consumo actual'}
              </p>
              <p className="text-lg font-semibold text-slate-800 mt-0.5 font-mono">
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(user.balance ?? 0)}
              </p>
            </div>
            {user.billingType === 'postpaid' && user.creditLimit != null && (
              <div className="border-l border-slate-200 pl-4">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Límite de crédito</p>
                <p className="text-lg font-semibold text-slate-800 mt-0.5 font-mono">
                  {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(user.creditLimit)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tarifas */}
        {!hasPricing ? (
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500 text-sm">No tienes tarifas configuradas. Contacta a tu proveedor.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Tarifas por canal</h2>

            {pricing.sms && (
              <Channel icon={MessageSquare} title="SMS" color="bg-blue-50 text-blue-700">
                <tbody>
                  <Row label="Marketing"      value={pricing.sms.marketing} />
                  <Row label="Transaccional"  value={pricing.sms.transaccional} />
                </tbody>
              </Channel>
            )}

            {pricing.whatsapp && (
              <Channel icon={MessageCircle} title="WhatsApp" color="bg-green-50 text-green-700">
                <tbody>
                  <Row label="Marketing"    value={pricing.whatsapp.marketing} />
                  <Row label="OTP"          value={pricing.whatsapp.otp} />
                  <Row label="Notificación" value={pricing.whatsapp.notificacion} />
                </tbody>
              </Channel>
            )}

            {pricing.rcs && (
              <Channel icon={Smartphone} title="RCS" color="bg-purple-50 text-purple-700">
                <tbody>
                  <Row label="Simple"         value={pricing.rcs.simple} />
                  <Row label="Basic"          value={pricing.rcs.basic} />
                  <Row label="Conversacional" value={pricing.rcs.conversacional} />
                </tbody>
              </Channel>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
