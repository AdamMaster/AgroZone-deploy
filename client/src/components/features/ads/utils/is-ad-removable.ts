import { IAd } from '../types/ad.types'

// Объявления в этих статусах «живые»: видны покупателям (PUBLISHED) или
// проходят модерацию (PENDING). Владелец не может удалить их напрямую —
// сначала их нужно снять с публикации (в архив) и удалять уже оттуда. Это
// зеркало серверного правила AD_STATUSES_BLOCKING_OWNER_REMOVAL
// (server/src/ads/constants/ads.constants.ts): сервер отклонит удаление в
// этих статусах, а клиент просто не показывает кнопку «Удалить».
const ACTIVE_AD_STATUSES: readonly IAd['status'][] = ['PUBLISHED', 'PENDING']

export const isAdRemovable = (status: IAd['status']): boolean => !ACTIVE_AD_STATUSES.includes(status)
