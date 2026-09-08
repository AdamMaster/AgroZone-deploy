import { Controller, Get, Param, Query } from '@nestjs/common'
import { CategoriesService } from './categories.service'
import { CategoryMetaDto } from './dto/category-meta.dto'
import { SearchCategoriesDto } from './dto/search-categories.dto'

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll()
  }

  @Get('search-suggest')
  searchSuggest(@Query() query: SearchCategoriesDto) {
    return this.categoriesService.searchBySemantic(query.q ?? '')
  }

  // name+description ОДНОЙ категории по fullPath — для meta description
  // страницы каталога (см. CategoriesService.findMetaByFullPath). fullPath
  // передаём query-параметром, а не сегментом пути (:fullPath), потому что
  // он сам содержит "/" (например "tehnika/traktory") — сегмент маршрута
  // оборвал бы его на первом слэше.
  @Get('meta')
  findMeta(@Query() query: CategoryMetaDto) {
    return this.categoriesService.findMetaByFullPath(query.fullPath)
  }

  // Определения атрибутов конкретной категории — точечный запрос взамен
  // прежнего подмешивания categoryFeatures всех 610 категорий в findAll().
  // См. подробный комментарий в CategoriesService.getFeatures().
  @Get(':id/features')
  getFeatures(@Param('id') id: string) {
    return this.categoriesService.getFeatures(id)
  }
}
