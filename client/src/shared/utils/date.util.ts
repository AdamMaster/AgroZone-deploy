// Общая проверка "срок ещё не истёк" — переиспользуется везде, где нужно
// понять, активна ли ещё платная услуга со сроком действия
// (bumpServiceUntil, priceHighlightUntil, badgeUntil и т.п.). premiumUntil
// не переведён на эту утилиту намеренно — isPremiumActive уже используется
// в нескольких местах, лишний рефакторинг рабочего кода ни к чему.
export const isFutureDate = (value?: Date | string | null): boolean => !!value && new Date(value) > new Date()

// Полная дата в человекочитаемом виде — "3 сентября 2026". Общий формат для
// админки (регистрация пользователя, удаление аккаунта, дата объявления и
// т.п.) — раньше эта же реализация была продублирована в UsersSearch и
// UserAdminDetail под разными именами.
export const formatFullDate = (value: Date | string): string =>
  new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

// Дата в формате, который понимает <input type='date'> — 'yyyy-MM-dd', в
// локальном часовом поясе (не toISOString(), тот отдаёт UTC-дату и на
// вечер по МСК "съезжает" на день назад). null/undefined — пустой инпут,
// чтобы админ явно видел "срок не задан", а не сегодняшнюю дату по
// умолчанию. Используется в SetPremiumDialog/SetAdExpirationDialog —
// оба места, где админ вручную редактирует "дату-до".
export const toDateInputValue = (value: Date | string | null | undefined): string => {
  if (!value) return ''

  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
