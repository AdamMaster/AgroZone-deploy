import { Type } from 'class-transformer'
import { IsInt, IsOptional, Max, Min } from 'class-validator'

import {
  SELLER_REPORTS_QUEUE_PAGE_SIZE_DEFAULT,
  SELLER_REPORTS_QUEUE_PAGE_SIZE_MAX
} from '../constants/seller-reports.constants'

export class FindSellerReportsQueueQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SELLER_REPORTS_QUEUE_PAGE_SIZE_MAX)
  limit?: number = SELLER_REPORTS_QUEUE_PAGE_SIZE_DEFAULT
}
