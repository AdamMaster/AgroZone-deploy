import { Type } from 'class-transformer'
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

import {
  REGISTRATION_ATTEMPTS_PAGE_SIZE_DEFAULT,
  REGISTRATION_ATTEMPTS_PAGE_SIZE_MAX
} from '../constants/registration-attempts.constants'

// problems — не дошли до конца: ошибка или брошено; all — всё;
// completed — завершили регистрацию.
export const REGISTRATION_ATTEMPT_FILTERS = ['problems', 'all', 'completed'] as const
export type RegistrationAttemptFilter = (typeof REGISTRATION_ATTEMPT_FILTERS)[number]

export class FindRegistrationAttemptsQueryDto {
  @IsOptional()
  @IsIn(REGISTRATION_ATTEMPT_FILTERS)
  filter: RegistrationAttemptFilter = 'problems'

  @IsOptional()
  @IsIn(['PHONE', 'EMAIL'])
  channel?: 'PHONE' | 'EMAIL'

  @IsOptional()
  @IsIn(['SITE', 'APP', 'UNKNOWN'])
  platform?: 'SITE' | 'APP' | 'UNKNOWN'

  // Часть телефона или почты.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(REGISTRATION_ATTEMPTS_PAGE_SIZE_MAX)
  limit: number = REGISTRATION_ATTEMPTS_PAGE_SIZE_DEFAULT
}
