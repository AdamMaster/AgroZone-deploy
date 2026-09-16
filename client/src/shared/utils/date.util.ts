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
