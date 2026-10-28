import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

import {
  SELLER_REVIEW_MODERATION_PAGE_SIZE_DEFAULT,
  SELLER_REVIEW_MODERATION_PAGE_SIZE_MAX
} from '../constants/seller-reviews.constants'

export class FindReviewModerationQueueQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SELLER_REVIEW_MODERATION_PAGE_SIZE_MAX)
  limit?: number = SELLER_REVIEW_MODERATION_PAGE_SIZE_DEFAULT
}
