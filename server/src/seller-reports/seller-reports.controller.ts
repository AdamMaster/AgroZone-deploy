import { Body, Controller, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common'

import { CurrentUser } from '@/auth/decorators/decorators/user.decorator'
import { AuthGuard } from '@/auth/guards/auth.guard'
import { SellerRatingsEnabledGuard } from '@/seller-reviews/guards/seller-ratings-enabled.guard'

import { CreateSellerReportDto } from './dto/create-seller-report.dto'
import { SellerReportsService } from './seller-reports.service'

// Гард флага стоит раньше AuthGuard: пока рейтинги выключены, ручка отвечает
// 404 одинаково для всех (так же, как отзывы).
@Controller('users/:sellerId/reports')
@UseGuards(SellerRatingsEnabledGuard, AuthGuard)
export class SellerReportsController {
  constructor(private readonly sellerReportsService: SellerReportsService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  report(
    @Param('sellerId', ParseUUIDPipe) sellerId: string,
    @CurrentUser('id') reporterId: string,
    @Body() dto: CreateSellerReportDto
  ) {
    return this.sellerReportsService.report(sellerId, reporterId, dto)
  }
}
