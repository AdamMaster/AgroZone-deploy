import { SellerReportReason } from '@/components/features/sellers/types'

// Подписи причин жалобы на продавца — тот же приём, что и у жалоб на
// объявления (ad-report-reasons.ts): фиксированный список.
export const SELLER_REPORT_REASON_LABELS: Record<SellerReportReason, string> = {
  [SellerReportReason.PrepaymentScam]: 'Взял предоплату и пропал',
  [SellerReportReason.FakeAd]: 'Объявление-обманка',
  [SellerReportReason.StolenPhotos]: 'Чужие фото',
  [SellerReportReason.DifferentItem]: 'Товар не соответствует описанию',
  [SellerReportReason.Other]: 'Другое'
}

export const SELLER_REPORT_REASON_OPTIONS = Object.values(SellerReportReason).map(value => ({
  value,
  label: SELLER_REPORT_REASON_LABELS[value]
}))
