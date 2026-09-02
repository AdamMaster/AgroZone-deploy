import { AdReportReason } from '@/components/features/ads/types/ad.types'

// Подписи причин жалобы на объявление — фиксированный список, чтобы
// модератору потом было проще группировать жалобы, а не разбирать
// произвольный текст (свободный комментарий остаётся опциональным
// дополнением, а не заменой причины).
export const AD_REPORT_REASON_LABELS: Record<AdReportReason, string> = {
  [AdReportReason.Scam]: 'Мошенничество',
  [AdReportReason.WrongCategory]: 'Не та категория',
  [AdReportReason.ProhibitedItem]: 'Запрещённый товар',
  [AdReportReason.Duplicate]: 'Дубликат объявления',
  [AdReportReason.Spam]: 'Спам / реклама',
  [AdReportReason.Other]: 'Другое'
}

export const AD_REPORT_REASON_OPTIONS = Object.values(AdReportReason).map(value => ({
  value,
  label: AD_REPORT_REASON_LABELS[value]
}))
