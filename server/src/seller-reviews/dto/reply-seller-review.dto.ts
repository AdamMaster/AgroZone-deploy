import { IsString, MaxLength } from 'class-validator'

import { SELLER_REVIEW_REPLY_MAX_LENGTH } from '../constants/seller-reviews.constants'

export class ReplySellerReviewDto {
  @IsString()
  @MaxLength(SELLER_REVIEW_REPLY_MAX_LENGTH)
  text!: string
}
