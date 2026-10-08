import { Transform } from 'class-transformer'
import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString } from 'class-validator'
import { IsPhoneNumberString } from '@/libs/common/decorators/is-phone-number-string.decorator'
import { PriceUnit, Prisma } from '@/generated/prisma/client'

export class UpdateAdDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  price?: number

  // Раньше отсутствовало в UpdateAdDto — форма (buildAdFormData) всегда
  // отправляет unit при сохранении (в схеме формы у него default('ITEM')),
  // а бэкенд с включённым forbidNonWhitelisted эту поле не знал и ронял
  // весь запрос на редактирование ("property unit should not exist"),
  // никак не связано с фильтром по локации — баг был и раньше, просто не
  // всплывал, пока не попробовали отредактировать объявление в этой сессии.
  @IsOptional()
  @IsEnum(PriceUnit)
  unit?: PriceUnit

  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value
    return value ? [value] : []
  })
  @IsArray()
  @IsString({ each: true })
  existingImages?: string[]

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  lat?: number

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  lng?: number

  @IsOptional()
  @IsString()
  region?: string

  @IsOptional()
  @IsString()
  regionIsoCode?: string

  @IsOptional()
  @IsString()
  locality?: string

  @IsOptional()
  @IsString()
  localityFiasId?: string

  @IsOptional()
  @IsString({ message: 'Номер телефона должен быть строкой.' })
  @IsPhoneNumberString()
  phone?: string

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? JSON.parse(value) : value))
  @IsObject()
  features?: Record<string, unknown>

  @IsOptional()
  @IsString()
  categoryId?: string
}
