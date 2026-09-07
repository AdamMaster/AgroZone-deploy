// Единственное место, где решается, как расстояние до объявления (F3,
// радиус-поиск каталога) выглядит в интерфейсе — то же соглашение, что и у
// formatPrice/formatPriceWithUnit в этом же каталоге: одна функция вместо
// того, чтобы карточка/чип каждый раз заново решали, сколько знаков после
// запятой показывать.
//
// distanceKm приходит с бэкенда УЖЕ округлённым до 0.1 км (см. AdsService.
// findAll — Math.round(distanceKm * 10) / 10), так что здесь только выбор
// единицы отображения: до 1 км — в метрах (иначе «0.1 км» выглядит менее
// понятно, чем «100 м», особенно для одного и того же населённого пункта),
// дальше — в километрах без дробной части (десятые важны только на malenьких
// расстояниях, для «53.4 км» точность до 100 м не имеет практического
// смысла).
export function formatDistance(distanceKm: number | null | undefined): string | null {
  if (distanceKm === null || distanceKm === undefined) return null

  if (distanceKm < 1) {
    const meters = Math.round(distanceKm * 1000)
    return `${meters} м`
  }

  return `${Math.round(distanceKm)} км`
}
