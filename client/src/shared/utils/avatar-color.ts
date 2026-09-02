// Детерминированный цвет фона для аватарки-заглушки (первая буква имени),
// когда у пользователя не загружено фото. Цвет вычисляется по id
// пользователя — не хранится в БД и не меняется между рендерами/сессиями,
// но при этом у разных пользователей аватарки визуально отличаются.
// Все цвета — из середины Tailwind-палитры (оттенок 600), подобраны так,
// чтобы белый текст поверх них хорошо читался, и без зелёных/лаймовых
// тонов, которые сливались бы с основным цветом бренда (--primary).
const AVATAR_COLORS = [
  '#DC2626', // red
  '#EA580C', // orange
  '#D97706', // amber
  '#0D9488', // teal
  '#0891B2', // cyan
  '#2563EB', // blue
  '#4F46E5', // indigo
  '#7C3AED', // violet
  '#C026D3', // fuchsia
  '#DB2777', // pink
  '#E11D48' // rose
]

export function getAvatarColor(seed: string | null | undefined): string {
  if (!seed) return AVATAR_COLORS[0]

  let hash = 0

  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }

  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
