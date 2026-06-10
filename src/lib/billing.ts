import { prisma } from './prisma'

export type PricingMap = {
  sms?: { marketing?: number; transaccional?: number }
  whatsapp?: { marketing?: number; otp?: number; notificacion?: number }
  rcs?: { simple?: number; basic?: number; conversacional?: number }
}

export type BillingCheck = { canSend: true; warning?: string } | { canSend: false; error: string }

export function parsePricing(raw: string | null | undefined): PricingMap {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

export function getRate(pricing: PricingMap, channel: string, category?: string | null): number {
  const ch = (pricing as Record<string, Record<string, number>>)[channel]
  if (!ch) return 0
  if (category && ch[category] != null) return ch[category]
  const first = Object.values(ch)[0]
  return first ?? 0
}

export async function checkBilling(userId: string): Promise<BillingCheck> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      billingType: true, balance: true, balanceExpiresAt: true, creditLimit: true, parentId: true,
      parent: { select: { billingType: true, balance: true, balanceExpiresAt: true, creditLimit: true, parentId: true } },
    },
  })
  if (!user) return { canSend: true }

  const billing = (user.role === 'user' && user.parent?.billingType) ? user.parent : user
  if (!billing.billingType) return { canSend: true }

  const hasResellerParent = user.role === 'user'
    ? (user.parent?.parentId != null)
    : (user.parentId != null)

  if (billing.billingType === 'prepaid') {
    const expired = billing.balanceExpiresAt != null && billing.balanceExpiresAt < new Date()
    const noBalance = billing.balance == null || billing.balance <= 0
    if (expired || noBalance) {
      const reason = expired ? 'Vigencia del saldo vencida' : 'Saldo insuficiente'
      if (hasResellerParent) return { canSend: true, warning: reason }
      return { canSend: false, error: reason }
    }
  }

  if (billing.billingType === 'postpaid') {
    if (billing.creditLimit != null && billing.balance != null && billing.balance >= billing.creditLimit) {
      if (hasResellerParent) return { canSend: true, warning: 'Crédito agotado' }
      return { canSend: false, error: 'Crédito agotado. Contacta a tu proveedor.' }
    }
  }

  return { canSend: true }
}

export async function recordDebit(
  userId: string,
  messageCount: number,
  channel: string,
  category?: string | null,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      billingType: true, pricing: true, parentId: true,
      parent: { select: { billingType: true, pricing: true } },
    },
  })
  if (!user) return

  const useParent = user.role === 'user' && !!user.parent?.billingType && !!user.parentId
  const billingUserId = useParent ? user.parentId! : userId
  const billingType   = useParent ? user.parent!.billingType : user.billingType
  const rawPricing    = useParent ? user.parent!.pricing : user.pricing

  if (!billingType) return

  const pricing = parsePricing(rawPricing)
  const rate = getRate(pricing, channel, category)
  if (rate <= 0) return

  const cost = messageCount * rate

  await prisma.$transaction([
    prisma.user.update({
      where: { id: billingUserId },
      data: billingType === 'prepaid'
        ? { balance: { decrement: cost } }
        : { balance: { increment: cost } },
    }),
    prisma.balanceTransaction.create({
      data: {
        userId: billingUserId,
        amount: -cost,
        type: 'debit',
        note: `${messageCount} msg · ${channel}/${category ?? 'default'} · $${rate}/msg`,
      },
    }),
  ])
}
