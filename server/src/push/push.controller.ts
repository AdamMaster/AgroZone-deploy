import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common'

import { CurrentUser } from '@/auth/decorators/decorators/user.decorator'
import { AuthGuard } from '@/auth/guards/auth.guard'

import { RegisterPushDeviceDto, UnregisterPushDeviceDto } from './dto/register-push-device.dto'
import { PushService } from './push.service'

// Устройства для push. Приложение регистрирует токен после входа и при каждом
// запуске (токен может смениться), а при выходе из аккаунта убирает.
@Controller('push-devices')
@UseGuards(AuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post()
  @HttpCode(204)
  register(@CurrentUser('id') userId: string, @Body() dto: RegisterPushDeviceDto) {
    return this.pushService.registerDevice(userId, dto)
  }

  @Post('unregister')
  @HttpCode(204)
  unregister(@CurrentUser('id') userId: string, @Body() dto: UnregisterPushDeviceDto) {
    return this.pushService.unregisterDevice(userId, dto.provider, dto.token)
  }
}
