import { OmitType, PartialType } from '@nestjs/mapped-types'
import { Transform } from 'class-transformer'
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator'
import { CreateAdDto } from './create-ad.dto'

// Пустое поле формы клиент не присылает вовсе, но и пустую строку считаем
// «не указано», а не числом 0.
const toOptionalNumber = ({ value }: { value: unknown }) =>
  value === '' || value === null || value === undefined ? undefined : Number(value)

// Черновик — неполное объявление: обязательны только название и категория (без
// них его нечем назвать и нечем показать в списке), остальное можно
// дозаполнить потом. Полноту проверяет публикация (см.
// getMissingPublishFields), а не сохранение.
export class SaveDraftDto extends PartialType(OmitType(CreateAdDto, ['title', 'categoryId', 'lat', 'lng'] as const)) {
  @IsString()
  @IsNotEmpty()
  title!: string

  @IsString()
  @IsNotEmpty()
  categoryId!: string

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  lat?: number

  @IsOptional()
  @Transform(toOptionalNumber)
  @IsNumber()
  lng?: number
}
