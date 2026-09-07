import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'

import { AuthGuard } from '@/auth/guards/auth.guard'
import { Roles } from '@/auth/decorators/roles.decorator'
import { RolesGuard } from '@/auth/guards/roles.guard'
import { CurrentUser } from '@/auth/decorators/decorators/user.decorator'
import { UserRole } from '@/generated/prisma/enums'

import { DealerFeedsService } from './dealer-feeds.service'
import { SubmitDealerFeedDto } from './dto/submit-dealer-feed.dto'
import { RejectDealerFeedDto } from './dto/reject-dealer-feed.dto'
import { CreateDealerSubscriptionDto } from './dto/create-dealer-subscription.dto'
import { DealerFeedSyncThrottlerGuard } from './guards/dealer-feed-sync-throttler.guard'
import { DealerSubscriptionsService } from './subscriptions/dealer-subscriptions.service'

// Не чаще раза в 5 минут на дилера — см. DealerFeedSyncThrottlerGuard.
const DEALER_FEED_SYNC_THROTTLE = { default: { limit: 1, ttl: 300000 } }

@Controller('dealer-feeds')
export class DealerFeedsController {
  constructor(
    private readonly dealerFeedsService: DealerFeedsService,
    private readonly dealerSubscriptionsService: DealerSubscriptionsService
  ) {}

  // --- Дилер (свой собственный фид) ---

  @Post()
  @UseGuards(AuthGuard)
  submit(@Body() dto: SubmitDealerFeedDto, @CurrentUser('id') userId: string) {
    return this.dealerFeedsService.submit(userId, dto.url)
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getMine(@CurrentUser('id') userId: string) {
    return this.dealerFeedsService.getMine(userId)
  }

  @Get('me/preview')
  @UseGuards(AuthGuard)
  previewMine(@CurrentUser('id') userId: string) {
    return this.dealerFeedsService.previewMine(userId)
  }

  @Post('me/pause')
  @UseGuards(AuthGuard)
  pauseMine(@CurrentUser('id') userId: string) {
    return this.dealerFeedsService.setPaused(userId, true)
  }

  @Post('me/resume')
  @UseGuards(AuthGuard)
  resumeMine(@CurrentUser('id') userId: string) {
    return this.dealerFeedsService.setPaused(userId, false)
  }

  @Post('me/sync')
  @UseGuards(AuthGuard, DealerFeedSyncThrottlerGuard)
  @Throttle(DEALER_FEED_SYNC_THROTTLE)
  syncMine(@CurrentUser('id') userId: string) {
    return this.dealerFeedsService.syncMine(userId)
  }

  @Post('me/subscription')
  @UseGuards(AuthGuard)
  createSubscriptionCheckout(@Body() dto: CreateDealerSubscriptionDto, @CurrentUser('id') userId: string) {
    return this.dealerSubscriptionsService.createCheckout(userId, dto.tier)
  }

  // Ручная перепроверка статуса оплаты без вебхука — см.
  // PremiumController.checkStatus для подробностей про сам приём.
  @Get('me/subscription/:subscriptionId/status')
  @UseGuards(AuthGuard)
  checkSubscriptionStatus(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string,
    @CurrentUser('id') userId: string
  ) {
    return this.dealerSubscriptionsService.checkStatus(subscriptionId, userId)
  }

  // --- Админ ---
  // Литеральный префикс 'admin/...' зарегистрирован раньше ':id'-путей у
  // нас их просто нет в этом контроллере вовсе, поэтому конфликтов вида
  // ":id" перехватывает "admin" (см. похожий комментарий в
  // ads.controller.ts про 'locations') тут не возникает — единственные
  // динамические параметры ниже это /admin/:id/..., отдельная от
  // дилерских /me-путей ветка.

  @Get('admin/pending')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  findPending(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number
  ) {
    return this.dealerFeedsService.findPending(page, limit)
  }

  @Get('admin')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  findAllForAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number
  ) {
    return this.dealerFeedsService.findAllForAdmin(page, limit)
  }

  @Get('admin/:id/preview')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  previewForAdmin(@Param('id') id: string) {
    return this.dealerFeedsService.previewById(id)
  }

  @Patch('admin/:id/approve')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  approve(@Param('id') id: string, @CurrentUser('id') adminUserId: string) {
    return this.dealerFeedsService.approve(id, adminUserId)
  }

  @Patch('admin/:id/reject')
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  reject(@Param('id') id: string, @CurrentUser('id') adminUserId: string, @Body() dto: RejectDealerFeedDto) {
    return this.dealerFeedsService.reject(id, adminUserId, dto.reason)
  }
}
