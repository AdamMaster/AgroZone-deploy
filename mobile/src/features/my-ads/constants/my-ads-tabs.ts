import type { AdStatus } from '../types/my-ad.types'

export type MyAdsTabKey = 'published' | 'archived' | 'draft' | 'rejected' | 'expired'

export interface MyAdsTab {
  key: MyAdsTabKey
  label: string
  statuses: readonly AdStatus[]
}

// Вкладки «Моих объявлений» — те же, что у ContentAds сайта, в том же
// порядке. Объявление на модерации показывается среди опубликованных.
export const MY_ADS_TABS: readonly MyAdsTab[] = [
  { key: 'published', label: 'Опубликованные', statuses: ['PUBLISHED', 'PENDING'] },
  { key: 'archived', label: 'Архив', statuses: ['ARCHIVED'] },
  { key: 'draft', label: 'Черновики', statuses: ['DRAFT'] },
  { key: 'rejected', label: 'Отклонённые', statuses: ['REJECTED'] },
  { key: 'expired', label: 'Завершенные', statuses: ['EXPIRED'] }
]
