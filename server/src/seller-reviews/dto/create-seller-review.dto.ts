import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

import {
  SELLER_REVIEW_RATING_MAX,
  SELLER_REVIEW_RATING_MIN,
  SELLER_REVIEW_TEXT_MAX_LENGTH
} from '../constants/seller-reviews.constants'

export class CreateSellerReviewDto {
  @IsInt()
  @Min(SELLER_REVIEW_RATING_MIN)
  @Max(SELLER_REVIEW_RATING_MAX)
  rating!: number

  @IsOptional()
  @IsString()
  @MaxLength(SELLER_REVIEW_TEXT_MAX_LENGTH)
  text?: string
}
