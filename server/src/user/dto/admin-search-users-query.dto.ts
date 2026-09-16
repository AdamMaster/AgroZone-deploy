import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

// Поиск пользователей из админки (/admin/users) — единая строка query
// сравнивается сразу с displayName, email и телефоном (см.
// UserService.searchByAdmin), без отдельных полей под каждый вариант: так
// проще для администратора (один инпут, не нужно угадывать, что именно он
// ищет — имя, почту или номер) и так же сделан общий поиск по объявлениям
// на публичном сайте (FindAdsQueryDto.search).
export class AdminSearchUsersQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  query?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number
}
