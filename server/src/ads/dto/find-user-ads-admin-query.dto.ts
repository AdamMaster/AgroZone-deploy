import { Type } from 'class-transformer'
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator'
import { AdStatus } from '@/generated/prisma/enums'

// Список объявлений конкретного пользователя для карточки в админке
// (/admin/users/:id) — в отличие от публичного GET /ads (только PUBLISHED)
// и от FindMyAdsQueryDto (тот же принцип, но для самого владельца, см.
// AdsController.findMyAds), тут админу нужно видеть ВСЕ статусы сразу,
// включая черновики и отклонённые — тот же status-фильтр оставлен
// опциональным просто для удобства, если админу нужно сузить список.
export class FindUserAdsAdminQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number

  @IsOptional()
  @IsEnum(AdStatus)
  status?: AdStatus
}
