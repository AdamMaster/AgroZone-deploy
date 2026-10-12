import type { AdDetail } from '@/features/ads/types/ad-detail.types'

import type { UploadFile } from '@/lib/api/upload-file'

// Фото в форме: уже загруженное (ссылка) или только что выбранное и
// сжатое на телефоне. id — стабильный ключ для перестановки.
export type AdFormPhoto = { kind: 'remote'; id: string; url: string } | { kind: 'local'; id: string; file: UploadFile }

// Объявление для редактирования — GET /ads/my/:id: владельцу сервер
// отдаёт ещё и точку, место и телефон.
export interface EditableAd extends AdDetail {
  lat: number
  lng: number
  region: string | null
  regionIsoCode: string | null
  locality: string | null
  localityFiasId: string | null
  phone: string | null
}
