import { IUser } from '@/components/features/auth/types'

export function getPrimaryPhone(user?: IUser) {
  if (!user?.phones?.length) return ''

  return user.phones.find(phone => phone.isPrimary)?.phone ?? user.phones[0]?.phone ?? ''
}

// Клиентская копия серверной is-premium-active.util.ts — тот же самый
// критерий ("premiumUntil есть и ещё в будущем"), но нужен отдельно на
// фронте: тут нельзя импортировать серверный код, а данные до этого
// момента уже приехали через API (см. IAdUser.premiumUntil,
// IUser.premiumUntil) и дальше их читает сразу несколько компонентов
// (ContentPremium, AdShortCard, AdDetail) — раньше каждый писал это
// сравнение дат руками, теперь один источник истины.
export function isPremiumActive(premiumUntil?: string | Date | null): boolean {
  return !!premiumUntil && new Date(premiumUntil) > new Date()
}
