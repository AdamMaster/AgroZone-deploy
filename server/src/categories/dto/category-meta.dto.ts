import { IsString, MinLength } from 'class-validator'

// fullPath — тот же путь, что клиент строит из сегментов URL каталога
// (slugPath = slug.join('/'), см. getSlugPath/buildCategoryMap на клиенте)
// и сравнивает с уникальным Category.fullPath. Отдельный DTO, а не голый
// @Query('fullPath') string, чтобы валидация была явной и в одном месте —
// как у соседнего SearchCategoriesDto.
export class CategoryMetaDto {
  @IsString()
  @MinLength(1)
  fullPath!: string
}
