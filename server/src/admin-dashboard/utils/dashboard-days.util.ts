import { DASHBOARD_TIME_ZONE, DASHBOARD_UTC_OFFSET } from '../constants/admin-dashboard.constants'

const MS_PER_DAY = 24 * 60 * 60 * 1000

// 'en-CA' — единственная локаль, у которой короткая дата уже в виде
// 'YYYY-MM-DD'; с timeZone это ключ календарного дня в часовом поясе
// дашборда (а не UTC-дня, как отдал бы toISOString).
const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DASHBOARD_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
})

export const toDayKey = (date: Date): string => dayKeyFormatter.format(date)

// Ключи дней периода по возрастанию, последний — день `now`. Шагаем по
// UTC-полудням, а не по полуночам: полдень по UTC в любом из реальных
// поясов попадает в нужный календарный день, так что цикл не зависит ни от
// смещения, ни от возможных переходов на летнее время.
export const buildDayKeys = (now: Date, days: number): string[] => {
  const todayNoon = Date.parse(`${toDayKey(now)}T12:00:00Z`)

  return Array.from({ length: days }, (_, index) =>
    new Date(todayNoon - (days - 1 - index) * MS_PER_DAY).toISOString().slice(0, 10)
  )
}

// Момент начала дня с данным ключом (по часовому поясу дашборда) в UTC —
// нижняя граница выборки для WHERE.
export const startOfDayUtc = (dayKey: string): Date => new Date(`${dayKey}T00:00:00${DASHBOARD_UTC_OFFSET}`)
