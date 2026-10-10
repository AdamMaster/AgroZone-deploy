import { ArrayMaxSize, IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator'
import { Transform, Type } from 'class-transformer'
import { AdStatus } from '@/generated/prisma/enums'

export class FindMyAdsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20

  // Один статус или несколько: вкладка «Опубликованные» в «Моих
  // объявлениях» — это PUBLISHED и PENDING вместе. Принимаем и повтор
  // параметра (?status=PUBLISHED&status=PENDING), и список через запятую.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  @IsEnum(AdStatus, { each: true })
  @ArrayMaxSize(Object.keys(AdStatus).length)
  status?: AdStatus[]
}
