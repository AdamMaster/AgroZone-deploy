import { Transform, Type } from 'class-transformer'
import { IsArray, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator'

import { SecurityEventType } from '@/generated/prisma/enums'

import { SECURITY_EVENTS_MAX_PAGE_SIZE } from '../constants/security-events.constants'

// Параметры чтения журнала безопасности — и для админки
// (GET users/admin/:id/security-events), и для самого пользователя
// (GET users/profile/security-events). types приходит строкой через запятую
// (?types=PASSWORD_CHANGED,EMAIL_CHANGED) — так клиентский FetchClient
// передаёт массивы проще всего, — здесь превращается в массив и
// валидируется по enum, произвольные значения отклоняются.
export class FindSecurityEventsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SECURITY_EVENTS_MAX_PAGE_SIZE)
  limit?: number

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.split(',').filter(item => item.length > 0) : value
  )
  @IsArray()
  @IsEnum(SecurityEventType, { each: true, message: 'Неизвестный тип события.' })
  types?: SecurityEventType[]
}
