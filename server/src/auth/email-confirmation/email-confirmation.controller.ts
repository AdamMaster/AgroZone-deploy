import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { PublicThrottlerGuard } from '@/libs/common/guards/public-throttler.guard'
import { EmailConfirmationService } from './email-confirmation.service'
import { Request } from 'express'
import { ConfirmationDto } from './dto/confirmation.dto'

@Controller('auth/email-confirmation')
export class EmailConfirmationController {
  constructor(private readonly emailConfirmationService: EmailConfirmationService) {}

  // Токен — uuid, перебором не угадать, но эндпоинт публичный и бьёт в базу — лимит по IP.
  @UseGuards(PublicThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 10 * 60 * 1000 } })
  @Post()
  @HttpCode(HttpStatus.OK)
  async newVerification(@Req() req: Request, @Body() dto: ConfirmationDto) {
    return this.emailConfirmationService.newVirification(req, dto)
  }
}
