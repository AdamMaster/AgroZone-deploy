import { Body, Controller, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { PasswordRecoveryService } from './password-recovery.service'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { CaptchaGuard } from '@/libs/captcha/captcha.guard'
import { PublicThrottlerGuard } from '@/libs/common/guards/public-throttler.guard'
import { NewPasswordDto } from './dto/new-password.dto'

@Controller('auth/password-recovery')
export class PasswordRecoveryController {
  constructor(private readonly passwordRecoveryService: PasswordRecoveryService) {}

  // Лимит по IP идёт ДО капчи: иначе каждый запрос атакующего сначала
  // тратил бы вызов проверки капчи во внешнем API. Лимит по адресу почты —
  // отдельно, в сервисе (см. PasswordRecoveryService.resetPassword).
  @UseGuards(PublicThrottlerGuard, CaptchaGuard)
  @Throttle({ default: { limit: 5, ttl: 10 * 60 * 1000 } })
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.passwordRecoveryService.resetPassword(dto)
  }

  @UseGuards(PublicThrottlerGuard, CaptchaGuard)
  @Throttle({ default: { limit: 10, ttl: 10 * 60 * 1000 } })
  @Post('new/:token')
  @HttpCode(HttpStatus.OK)
  async newPassword(@Body() dto: NewPasswordDto, @Param('token') token: string) {
    return this.passwordRecoveryService.newPassword(dto, token)
  }
}
