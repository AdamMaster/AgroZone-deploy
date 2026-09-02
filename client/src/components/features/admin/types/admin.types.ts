import { AdReportReason } from '@/components/features/ads/types/ad.types'

// Значения — строго как в enum AdReportStatus на бэкенде (prisma/schema.prisma).
export enum AdReportStatus {
  Pending = 'PENDING',
  Reviewed = 'REVIEWED',
  Dismissed = 'DISMISSED'
}

export interface IAdReportAd {
  id: string
  title: string
  images: string[]
}

export interface IAdReportUser {
  id: string
  displayName: string | null
}

export interface IAdReportAdmin {
  id: string
  reason: AdReportReason
  comment: string | null
  status: AdReportStatus
  createdAt: string
  ad: IAdReportAd
  user: IAdReportUser
}
