import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator'
import { SellerReportReason } from '@/generated/prisma/enums'

import { SELLER_REPORT_COMMENT_MAX_LENGTH } from '../constants/seller-reports.constants'

export class CreateSellerReportDto {
  @IsEnum(SellerReportReason)
  reason!: SellerReportReason

  // Объявление продавца, по которому произошёл обман.
  @IsOptional()
  @IsUUID()
  adId?: string

  @IsOptional()
  @IsString()
  @MaxLength(SELLER_REPORT_COMMENT_MAX_LENGTH)
  comment?: string
}
