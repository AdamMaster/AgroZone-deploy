import { UserType } from '@/components/features/auth/types'

// Подписи для типа продавца — переиспользуются и в форме настроек профиля
// (где значение выбирается), и на карточке объявления (где оно просто
// показывается).
export const USER_TYPE_LABELS: Record<UserType, string> = {
  [UserType.Individual]: 'Частное лицо',
  [UserType.IndividualEntrepreneur]: 'ИП',
  [UserType.Business]: 'Компания'
}

export const USER_TYPE_OPTIONS = Object.values(UserType).map(value => ({
  value,
  label: USER_TYPE_LABELS[value]
}))
