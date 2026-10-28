import { IAd } from '../types/ad.types'

// Объявления в этих статусах «живые»: видны покупателям (PUBLISHED),
// проходят модерацию (PENDING) или приостановлены до проверки жалоб
// (SUSPENDED — их вообще нельзя ни снять, ни удалить). Владелец не может
// удалить их напрямую — сначала их нужно снять с публикации (в архив) и
// удалять уже оттуда. Это
// зеркало серверного правила AD_STATUSES_BLOCKING_OWNER_REMOVAL
// (server/src/ads/constants/ads.constants.ts): сервер отклонит удаление в
// этих статусах, а клиент просто не показывает кнопку «Удалить».
const ACTIVE_AD_STATUSES: readonly IAd['status'][] = ['PUBLISHED', 'PENDING', 'SUSPENDED']

export const isAdRemovable = (status: IAd['status']): boolean => !ACTIVE_AD_STATUSES.includes(status)
