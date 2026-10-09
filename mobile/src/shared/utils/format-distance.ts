// Расстояние до объявления при поиске по радиусу — как formatDistance на
// сайте: до километра в метрах («350 м»), дальше в целых километрах
// («53 км»). Сервер присылает distanceKm уже округлённым до 0.1 км; null —
// поиск по радиусу в этом запросе не использовался.
export function formatDistance(distanceKm: number | null | undefined): string | null {
  if (distanceKm === null || distanceKm === undefined) return null

  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} м`

  return `${Math.round(distanceKm)} км`
}
