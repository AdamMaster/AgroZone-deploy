// «Срок ещё не истёк» — для платных услуг и премиума со сроком действия
// (priceHighlightUntil, badgeUntil, premiumUntil). Пустое значение — услуги нет.
export const isFutureDate = (value: string | null | undefined): boolean => !!value && new Date(value) > new Date()

const dayMonthFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const fullDateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
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

// «12 октября 2026 г.» — дата публикации объявления.
export const formatFullDate = (value: string): string => fullDateFormatter.format(new Date(value))

// «12.10» — день из даты вида «2026-10-12» (подписи недели в статистике).
export const formatShortIsoDate = (isoDate: string): string => {
  const [, month, day] = isoDate.split('-')
  return `${day}.${month}`
}

const dateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

// «12 октября 2026 г. в 14:05» — когда произошло событие безопасности.
export const formatDateTime = (value: string): string => dateTimeFormatter.format(new Date(value))

// «14:05», если сегодня, иначе «12 октября» — дата уведомления, как
// formatNotificationDate сайта.
export function formatTimeOrDayMonth(value: string): string {
  const date = new Date(value)

  return date.toDateString() === new Date().toDateString() ? timeFormatter.format(date) : formatDayMonth(value)
}
