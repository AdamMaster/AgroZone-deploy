import { IsOptional, IsString, MaxLength } from 'class-validator'

import { SELLER_REPORT_RESOLUTION_NOTE_MAX_LENGTH } from '../constants/seller-reports.constants'

export class RollbackSellerReviewsDto {
  @IsOptional()
  @IsString()
  @MaxLength(SELLER_REPORT_RESOLUTION_NOTE_MAX_LENGTH)
  note?: string
}
