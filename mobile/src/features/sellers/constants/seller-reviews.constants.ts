import type { SheetOption } from '@/shared/components/options-sheet'

import type { SellerReportReason, SellerReviewReportReason } from '../types/seller-review.types'

// Лимиты — как на сервере (seller-reviews.constants.ts): там они проверяются
// по-настоящему, здесь нужны только для maxLength поля и счётчика.
export const SELLER_REVIEW_TEXT_MAX_LENGTH = 1000
export const SELLER_REVIEW_REPLY_MAX_LENGTH = 1000
export const SELLER_REPORT_COMMENT_MAX_LENGTH = 1000

export const RATING_LABELS: Record<number, string> = {
  1: 'Ужасно',
  2: 'Плохо',
  3: 'Нормально',
  4: 'Хорошо',
  5: 'Отлично'
}

// Причины жалоб — те же подписи, что у сайта (shared/constants/
// seller-review-report-reasons.ts и seller-report-reasons.ts).
export const SELLER_REVIEW_REPORT_REASON_OPTIONS: readonly SheetOption<SellerReviewReportReason>[] = [
  { value: 'FAKE', label: 'Фейковый отзыв' },
  { value: 'ABUSIVE', label: 'Оскорбления' },
  { value: 'SPAM', label: 'Спам / реклама' },
  { value: 'PERSONAL_DATA', label: 'Личные данные' },
  { value: 'OTHER', label: 'Другое' }
]

export const SELLER_REPORT_REASON_OPTIONS: readonly SheetOption<SellerReportReason>[] = [
  { value: 'PREPAYMENT_SCAM', label: 'Взял предоплату и пропал' },
  { value: 'FAKE_AD', label: 'Объявление-обманка' },
  { value: 'STOLEN_PHOTOS', label: 'Чужие фото' },
  { value: 'DIFFERENT_ITEM', label: 'Товар не соответствует описанию' },
  { value: 'OTHER', label: 'Другое' }
]
