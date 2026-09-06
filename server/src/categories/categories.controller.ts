import { Controller, Get, Param, Query } from '@nestjs/common'
import { CategoriesService } from './categories.service'
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

  // Определения атрибутов конкретной категории — точечный запрос взамен
  // прежнего подмешивания categoryFeatures всех 610 категорий в findAll().
  // См. подробный комментарий в CategoriesService.getFeatures().
  @Get(':id/features')
  getFeatures(@Param('id') id: string) {
    return this.categoriesService.getFeatures(id)
  }
}
