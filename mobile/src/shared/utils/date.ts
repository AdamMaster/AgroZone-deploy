// «Срок ещё не истёк» — для платных услуг и премиума со сроком действия
// (priceHighlightUntil, badgeUntil, premiumUntil). Пустое значение — услуги нет.
export const isFutureDate = (value: string | null | undefined): boolean => !!value && new Date(value) > new Date()
