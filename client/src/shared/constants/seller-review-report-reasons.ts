import { SellerReviewReportReason } from '@/components/features/sellers/types'

// Подписи причин жалобы на отзыв о продавце — тот же приём, что и у жалоб на
// объявления (ad-report-reasons.ts): фиксированный список, чтобы модератору
// было проще группировать жалобы.
export const SELLER_REVIEW_REPORT_REASON_LABELS: Record<SellerReviewReportReason, string> = {
  [SellerReviewReportReason.Fake]: 'Фейковый отзыв',
  [SellerReviewReportReason.Abusive]: 'Оскорбления',
  [SellerReviewReportReason.Spam]: 'Спам / реклама',
  [SellerReviewReportReason.PersonalData]: 'Личные данные',
  [SellerReviewReportReason.Other]: 'Другое'
}

export const SELLER_REVIEW_REPORT_REASON_OPTIONS = Object.values(SellerReviewReportReason).map(value => ({
  value,
  label: SELLER_REVIEW_REPORT_REASON_LABELS[value]
}))
