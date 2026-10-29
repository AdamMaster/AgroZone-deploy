import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

import { PushProvider } from '@/generated/prisma/enums'

import { PUSH_APP_VERSION_MAX_LENGTH, PUSH_TOKEN_MAX_LENGTH, PUSH_TOKEN_MIN_LENGTH } from '../constants/push.constants'

export class RegisterPushDeviceDto {
  @IsEnum(PushProvider)
  provider!: PushProvider

  @IsString()
  @MinLength(PUSH_TOKEN_MIN_LENGTH)
  @MaxLength(PUSH_TOKEN_MAX_LENGTH)
  token!: string

  @IsOptional()
  @IsString()
  @MaxLength(PUSH_APP_VERSION_MAX_LENGTH)
  appVersion?: string
}

export class UnregisterPushDeviceDto {
  @IsEnum(PushProvider)
  provider!: PushProvider

  @IsString()
  @MinLength(PUSH_TOKEN_MIN_LENGTH)
  @MaxLength(PUSH_TOKEN_MAX_LENGTH)
  token!: string
}
