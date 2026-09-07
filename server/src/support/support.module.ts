import { forwardRef, Module } from '@nestjs/common'

import { AuthModule } from '@/auth/auth.module'
import { MailModule } from '@/libs/mail/mail.module'
import { PrismaService } from '@/prisma/prisma.service'
import { UserModule } from '@/user/user.module'

import { SupportGuestsService } from './support-guests.service'
import { SupportController } from './support.controller'
import { SupportGateway } from './support.gateway'
import { SupportIdentityService } from './support-identity.service'
import { SupportService } from './support.service'
import { SupportIdentityGuard } from './guards/support-identity.guard'

@Module({
  // forwardRef — AuthModule теперь тоже импортирует SupportModule (за
  // SupportGuestsService, см. AuthService.saveSession и "Долг" в
  // ROADMAP.md — склейка гостя поддержки с аккаунтом при входе), без
  // forwardRef с обеих сторон Nest не смог бы разрешить цикл модулей.
  imports: [UserModule, forwardRef(() => AuthModule), MailModule],
  controllers: [SupportController],
  providers: [
    SupportService,
    SupportGuestsService,
    SupportIdentityService,
    SupportIdentityGuard,
    // SessionMiddlewareHolder ему не нужен в providers — SessionModule
    // глобальный (см. session.module.ts), DI находит его сам.
    SupportGateway,
    PrismaService
  ],
  exports: [SupportGuestsService]
})
export class SupportModule {}
