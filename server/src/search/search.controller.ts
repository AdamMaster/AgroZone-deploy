import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { PublicThrottlerGuard } from '@/libs/common/guards/public-throttler.guard'
import { SearchService } from './search.service'
import { SearchQueryDto } from './dto/search-query.dto'

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  // Подсказки при наборе (с дебаунсом на клиенте) — 60 в минуту с IP хватает с запасом.
  @UseGuards(PublicThrottlerGuard)
  @Throttle({ default: { limit: 60, ttl: 60 * 1000 } })
  @Get('suggestions')
  getSuggestions(@Query() query: SearchQueryDto) {
    return this.searchService.getSearchSuggestions(query.q ?? '')
  }
}
