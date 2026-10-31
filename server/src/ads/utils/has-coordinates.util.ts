// Есть ли у объявления настоящая точка на карте. (0, 0) — не точка, а значение
// «не задано»: так форма отправляет адрес, у которого подсказка не вернула
// координат (то же значение ставят заглушкой в черновике). Реальных объявлений
// в Гвинейском заливе не бывает, поэтому ноль по обеим осям считаем отсутствием.
export function hasCoordinates(lat: unknown, lng: unknown): lat is number {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false

  return lat !== 0 || lng !== 0
}
