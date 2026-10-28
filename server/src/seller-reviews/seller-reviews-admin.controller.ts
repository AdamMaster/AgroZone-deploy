import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common'
import { UserRole } from '@/generated/prisma/enums'

import { CurrentUser } from '@/auth/decorators/decorators/user.decorator'
import { Roles } from '@/auth/decorators/roles.decorator'
import { AuthGuard } from '@/auth/guards/auth.guard'
import { RolesGuard } from '@/auth/guards/roles.guard'

import { FindReviewModerationQueueQueryDto } from './dto/find-review-moderation-queue-query.dto'
import { ModerateSellerReviewDto } from './dto/moderate-seller-review.dto'
import { SellerReviewModerationService } from './seller-review-moderation.service'

// Модерация отзывов о продавцах. Намеренно без SellerRatingsEnabledGuard:
// очередь и решения нужны и при выключенных рейтингах (например, разобрать
// накопившееся перед повторным включением).
@Controller('admin/seller-reviews')
@Roles(UserRole.ADMIN)
@UseGuards(AuthGuard, RolesGuard)
export class SellerReviewsAdminController {
  constructor(private readonly moderationService: SellerReviewModerationService) {}

  @Get()
  findQueue(@Query() query: FindReviewModerationQueueQueryDto) {
    return this.moderationService.findQueue(query)
  }

  @Patch(':id/moderation')
  moderate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') moderatorId: string,
    @Body() dto: ModerateSellerReviewDto
  ) {
    return this.moderationService.moderate(id, moderatorId, dto)
  }
}
