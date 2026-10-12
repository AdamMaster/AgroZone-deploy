import { Body, Controller, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { PasswordRecoveryService } from './password-recovery.service'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { CaptchaGuard } from '@/libs/captcha/captcha.guard'
import { PublicThrottlerGuard } from '@/libs/common/guards/public-throttler.guard'
import { NewPasswordDto } from './dto/new-password.dto'
import { PhoneResetDto } from './dto/phone-reset.dto'
import { NewPasswordByPhoneDto } from './dto/new-password-by-phone.dto'
import { getClientIp } from '@/libs/common/utils/request-ip.util'
import { Request } from 'express'

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

  // Сброс по звонку на номер (см. PasswordRecoveryService.phoneResetStart).
  // Капчи нет — как у регистрации по звонку: подтверждением служит сам
  // звонок с номера, а лимиты по IP и по номеру ограничивают траты на звонки.
  @UseGuards(PublicThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 10 * 60 * 1000 } })
  @Post('phone/start')
  @HttpCode(HttpStatus.OK)
  async phoneResetStart(@Req() req: Request, @Body() dto: PhoneResetDto) {
    // IP пользователя (не сервера) нужен sms.ru, чтобы выдать звонящему из-за
    // границы обычный номер вместо 8-800.
    return this.passwordRecoveryService.phoneResetStart(dto, getClientIp(req))
  }

  // Опрос приложения каждые несколько секунд, пока ждём звонок — это не
  // подбор, поэтому лимит выше, чем у остальных ручек.
  @UseGuards(PublicThrottlerGuard)
  @Throttle({ default: { limit: 30, ttl: 60 * 1000 } })
  @Post('phone/status')
  @HttpCode(HttpStatus.OK)
  async phoneResetStatus(@Body() dto: PhoneResetDto) {
    return this.passwordRecoveryService.phoneResetStatus(dto)
  }

  @UseGuards(PublicThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 10 * 60 * 1000 } })
  @Post('phone/new')
  @HttpCode(HttpStatus.OK)
  async newPasswordByPhone(@Body() dto: NewPasswordByPhoneDto) {
    return this.passwordRecoveryService.newPasswordByPhone(dto)
  }
}
