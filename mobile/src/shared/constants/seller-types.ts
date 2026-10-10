// Тип продавца — значения enum UserType сервера (prisma/schema.prisma),
// подписи — как USER_TYPE_LABELS сайта.
export type SellerType = 'INDIVIDUAL' | 'INDIVIDUAL_ENTREPRENEUR' | 'BUSINESS'

export const SELLER_TYPE_LABELS: Readonly<Record<SellerType, string>> = {
  INDIVIDUAL: 'Частное лицо',
  INDIVIDUAL_ENTREPRENEUR: 'ИП',
  BUSINESS: 'Компания'
}

export const SELLER_TYPE_OPTIONS = (Object.keys(SELLER_TYPE_LABELS) as SellerType[]).map(value => ({
  value,
  label: SELLER_TYPE_LABELS[value]
}))

export function isSellerType(value: unknown): value is SellerType {
  return typeof value === 'string' && value in SELLER_TYPE_LABELS
}
