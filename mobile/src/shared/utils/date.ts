// «Срок ещё не истёк» — для платных услуг и премиума со сроком действия
// (priceHighlightUntil, badgeUntil, premiumUntil). Пустое значение — услуги нет.
export const isFutureDate = (value: string | null | undefined): boolean => !!value && new Date(value) > new Date()

const dayMonthFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

// «12 октября» — до какого дня действует услуга.
export const formatDayMonth = (value: string): string => dayMonthFormatter.format(new Date(value))

// Когда что-то произошло, по-человечески: «сегодня в 14:05», «вчера» или
// «12 октября» — как подпись «Поднято …» на сайте.
export function formatRelativeDay(value: string): string {
  const date = new Date(value)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) return `сегодня в ${timeFormatter.format(date)}`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  return date.toDateString() === yesterday.toDateString() ? 'вчера' : formatDayMonth(value)
}
