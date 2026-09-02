// Общая проверка "срок ещё не истёк" — переиспользуется везде, где нужно
// понять, активна ли ещё платная услуга со сроком действия
// (bumpServiceUntil, priceHighlightUntil, badgeUntil и т.п.). premiumUntil
// не переведён на эту утилиту намеренно — isPremiumActive уже используется
// в нескольких местах, лишний рефакторинг рабочего кода ни к чему.
export const isFutureDate = (value?: Date | string | null): boolean => !!value && new Date(value) > new Date()
