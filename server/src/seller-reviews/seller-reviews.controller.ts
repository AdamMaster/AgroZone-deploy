import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common'

import { CurrentUser } from '@/auth/decorators/decorators/user.decorator'
import { AuthGuard } from '@/auth/guards/auth.guard'

import { CreateSellerReviewDto } from './dto/create-seller-review.dto'
import { FindSellerReviewsQueryDto } from './dto/find-seller-reviews-query.dto'
import { ReplySellerReviewDto } from './dto/reply-seller-review.dto'
import { ReportSellerReviewDto } from './dto/report-seller-review.dto'
import { UpdateSellerReviewDto } from './dto/update-seller-review.dto'
import { SellerRatingsEnabledGuard } from './guards/seller-ratings-enabled.guard'
import { SellerReviewReportsService } from './seller-review-reports.service'
import { SellerReviewsService } from './seller-reviews.service'

// Отзывы о конкретном продавце. Гард флага стоит на уровне класса и потому
// срабатывает раньше AuthGuard метода: пока рейтинги выключены, все ручки
// отвечают 404 одинаково, в том числе гостям.
@Controller('users/:sellerId/reviews')
@UseGuards(SellerRatingsEnabledGuard)
export class UserReviewsController {
  constructor(private readonly sellerReviewsService: SellerReviewsService) {}

  // Публичный список отзывов и рейтинг продавца.
  @Get()
  findForSeller(@Param('sellerId', ParseUUIDPipe) sellerId: string, @Query() query: FindSellerReviewsQueryDto) {
    return this.sellerReviewsService.findForSeller(sellerId, query)
  }

  // Мой отзыв этому продавцу и можно ли оставить новый.
  @Get('mine')
  @UseGuards(AuthGuard)
  findMine(@Param('sellerId', ParseUUIDPipe) sellerId: string, @CurrentUser('id') userId: string) {
    return this.sellerReviewsService.findMine(userId, sellerId)
  }

  @Post()
  @UseGuards(AuthGuard)
  create(
    @Param('sellerId', ParseUUIDPipe) sellerId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSellerReviewDto
  ) {
    return this.sellerReviewsService.create(userId, sellerId, dto)
  }
}

// Действия над уже существующим отзывом: автор правит и удаляет, продавец
// отвечает, любой пользователь может пожаловаться.
@Controller('seller-reviews')
@UseGuards(SellerRatingsEnabledGuard, AuthGuard)
export class SellerReviewsController {
  constructor(
    private readonly sellerReviewsService: SellerReviewsService,
    private readonly reportsService: SellerReviewReportsService
  ) {}

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSellerReviewDto
  ) {
    return this.sellerReviewsService.update(id, userId, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string) {
    return this.sellerReviewsService.remove(id, userId)
  }

  @Put(':id/reply')
  reply(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('id') userId: string, @Body() dto: ReplySellerReviewDto) {
    return this.sellerReviewsService.reply(id, userId, dto)
  }

  @Post(':id/reports')
  @HttpCode(HttpStatus.NO_CONTENT)
  report(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReportSellerReviewDto
  ) {
    return this.reportsService.report(id, userId, dto)
  }
}
