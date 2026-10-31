// «1 день», «3 дня», «5 дней», «11 дней», «21 день» — для текстов уведомлений и
// писем, где число приходит из константы и склонение нельзя зашить в строку.
export function formatDaysCount(count: number): string {
  const lastTwo = count % 100
  const last = count % 10

  if (lastTwo >= 11 && lastTwo <= 14) return `${count} дней`
  if (last === 1) return `${count} день`
  if (last >= 2 && last <= 4) return `${count} дня`

  return `${count} дней`
}
