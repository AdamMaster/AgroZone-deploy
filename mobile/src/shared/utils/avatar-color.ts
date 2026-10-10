// Цвета фона аватара без фото — те же, что у сайта
// (client/src/shared/utils/avatar-color.ts): у человека один и тот же цвет
// на сайте и в приложении.
const AVATAR_COLORS = [
  '#DC2626',
  '#EA580C',
  '#D97706',
  '#0D9488',
  '#0891B2',
  '#2563EB',
  '#4F46E5',
  '#7C3AED',
  '#C026D3',
  '#DB2777',
  '#E11D48'
] as const

// Цвет по id пользователя: стабильный хэш строки.
export function getAvatarColor(seed: string): string {
  let hash = 0

  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) | 0
  }

  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}
