// Значения — строго как в enum PremiumPurchaseStatus на бэкенде
// (prisma/schema.prisma).
export type PremiumPurchaseStatus = 'PENDING' | 'SUCCEEDED' | 'CANCELED'

export interface IPremiumPurchase {
  id: string
  userId: string
  amount: number
  status: PremiumPurchaseStatus
  yookassaPaymentId?: string | null
  isRecurring: boolean
  yookassaPaymentMethodId?: string | null
  createdAt: string
  paidAt?: string | null
}

export interface ICreatePremiumCheckoutResponse {
  confirmationUrl: string
  purchaseId: string
}
