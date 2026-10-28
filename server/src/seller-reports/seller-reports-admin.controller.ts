import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common'
import { UserRole } from '@/generated/prisma/enums'

import { CurrentUser } from '@/auth/decorators/decorators/user.decorator'
import { Roles } from '@/auth/decorators/roles.decorator'
import { AuthGuard } from '@/auth/guards/auth.guard'
import { RolesGuard } from '@/auth/guards/roles.guard'

import { FindSellerReportsQueueQueryDto } from './dto/find-seller-reports-queue-query.dto'
import { ResolveSellerReportsDto } from './dto/resolve-seller-reports.dto'
import { RollbackSellerReviewsDto } from './dto/rollback-seller-reviews.dto'
import { SellerReportsModerationService } from './seller-reports-moderation.service'

// Модерация жалоб на продавцов. Как и очередь отзывов, намеренно без гарда
// флага: разобрать накопившееся можно и при выключенных рейтингах.
@Controller('admin/seller-reports')
@Roles(UserRole.ADMIN)
@UseGuards(AuthGuard, RolesGuard)
export class SellerReportsAdminController {
  constructor(private readonly moderationService: SellerReportsModerationService) {}

  @Get()
  findQueue(@Query() query: FindSellerReportsQueueQueryDto) {
    return this.moderationService.findQueue(query)
  }

  @Get('sellers/:sellerId')
  getSellerCard(@Param('sellerId', ParseUUIDPipe) sellerId: string) {
    return this.moderationService.getSellerCard(sellerId)
  }

  @Post('sellers/:sellerId/resolution')
  resolve(
    @Param('sellerId', ParseUUIDPipe) sellerId: string,
    @CurrentUser('id') moderatorId: string,
    @Body() dto: ResolveSellerReportsDto
  ) {
    return this.moderationService.resolve(sellerId, moderatorId, dto)
  }

  @Post('sellers/:sellerId/reviews-rollback')
  rollbackReviews(
    @Param('sellerId', ParseUUIDPipe) sellerId: string,
    @CurrentUser('id') moderatorId: string,
    @Body() dto: RollbackSellerReviewsDto
  ) {
    return this.moderationService.rollbackReviews(sellerId, moderatorId, dto)
  }
}
