import { SellerReviewContactType, SellerReviewStatus } from '@/components/features/sellers/types'

import {
  SellerReportStatus,
  SellerReviewFilterFlag,
  SellerReviewSignalCode,
  SellerSanctionType
} from '../types/admin.types'

export const SELLER_REVIEW_FILTER_FLAG_LABELS: Record<SellerReviewFilterFlag, string> = {
  [SellerReviewFilterFlag.Profanity]: 'Мат',
  [SellerReviewFilterFlag.Link]: 'Ссылка',
  [SellerReviewFilterFlag.Phone]: 'Телефон',
  [SellerReviewFilterFlag.RepeatedText]: 'Повтор текста'
}

export const SELLER_REVIEW_STATUS_LABELS: Record<SellerReviewStatus, string> = {
  [SellerReviewStatus.Published]: 'Опубликован',
  [SellerReviewStatus.Pending]: 'На проверке',
  [SellerReviewStatus.Hidden]: 'Скрыт'
}

export const SELLER_REVIEW_CONTACT_TYPE_LABELS: Record<SellerReviewContactType, string> = {
  [SellerReviewContactType.DealConfirmed]: 'Сделка подтверждена',
  [SellerReviewContactType.Contact]: 'Только контакт'
}

export const SELLER_REPORT_STATUS_LABELS: Record<SellerReportStatus, string> = {
  [SellerReportStatus.Pending]: 'Новая',
  [SellerReportStatus.Accepted]: 'Принята',
  [SellerReportStatus.Dismissed]: 'Отклонена'
}

export const SELLER_SANCTION_TYPE_LABELS: Record<SellerSanctionType, string> = {
  [SellerSanctionType.Warning]: 'Предупреждение',
  [SellerSanctionType.AdsSuspended]: 'Объявления приостановлены',
  [SellerSanctionType.AdsRestored]: 'Объявления возвращены',
  [SellerSanctionType.ReviewsHidden]: 'Отзывы скрыты'
}

export const SELLER_REVIEW_SIGNAL_LABELS: Record<SellerReviewSignalCode, string> = {
  [SellerReviewSignalCode.YoungAuthors]: 'Много отзывов от новых аккаунтов без другой активности',
  [SellerReviewSignalCode.MostlyUnconfirmed]: 'Почти все отзывы без подтверждённой сделки',
  [SellerReviewSignalCode.ReciprocalReviews]: 'Взаимные отзывы: продавец оценил своих авторов в ответ',
  [SellerReviewSignalCode.ReviewBurst]: 'Всплеск: много отзывов за сутки',
  [SellerReviewSignalCode.SharedIpWithSeller]: 'У авторов отзывов общий IP с продавцом',
  [SellerReviewSignalCode.SharedIpAmongAuthors]: 'У авторов отзывов общий IP между собой'
}
