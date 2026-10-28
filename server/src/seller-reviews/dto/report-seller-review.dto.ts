import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'
import { SellerReviewReportReason } from '@/generated/prisma/enums'

import { SELLER_REVIEW_REPORT_COMMENT_MAX_LENGTH } from '../constants/seller-reviews.constants'

export class ReportSellerReviewDto {
  @IsEnum(SellerReviewReportReason)
  reason!: SellerReviewReportReason

  @IsOptional()
  @IsString()
  @MaxLength(SELLER_REVIEW_REPORT_COMMENT_MAX_LENGTH)
  comment?: string
}
