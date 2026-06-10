import { prisma } from './prisma'

export type BillingCheck = { canSend: true; warning?: string } | { canSend: false; error: string }

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

  // For role='user', billing is managed at the client (parent) level
  const billing = (user.role === 'user' && user.parent?.billingType) ? user.parent : user
  if (!billing.billingType) return { canSend: true }

  // "has reseller backing" — there's a parent tier that can absorb overages
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

export async function recordDebit(userId: string, messageCount: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      billingType: true, pricePerMessage: true, parentId: true,
      parent: { select: { billingType: true, pricePerMessage: true } },
    },
  })
  if (!user) return

  // For role='user', debit from parent client's balance
  const useParent = user.role === 'user' && !!user.parent?.billingType && !!user.parentId
  const billingUserId = useParent ? user.parentId! : userId
  const billingType   = useParent ? user.parent!.billingType    : user.billingType
  const price         = useParent ? user.parent!.pricePerMessage : user.pricePerMessage

  if (!billingType || !price || price <= 0) return

  const cost = messageCount * price
  await prisma.$transaction([
    prisma.user.update({
      where: { id: billingUserId },
      data: billingType === 'prepaid'
        ? { balance: { decrement: cost } }
        : { balance: { increment: cost } },
    }),
    prisma.balanceTransaction.create({
      data: { userId: billingUserId, amount: -cost, type: 'debit', note: `${messageCount} mensaje(s)` },
    }),
  ])
}
