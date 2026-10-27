import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator'

import { SELLER_REVIEWS_PAGE_SIZE_DEFAULT, SELLER_REVIEWS_PAGE_SIZE_MAX } from '../constants/seller-reviews.constants'

// Отзывы отдаются курсором (id последнего полученного), а не страницами: во
// время чтения появляются новые отзывы, и страницы съезжали бы.
export class FindSellerReviewsQueryDto {
  @IsOptional()
  @IsUUID()
  cursor?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SELLER_REVIEWS_PAGE_SIZE_MAX)
  limit?: number = SELLER_REVIEWS_PAGE_SIZE_DEFAULT
}
