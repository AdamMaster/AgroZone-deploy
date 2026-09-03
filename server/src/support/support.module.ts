import { Module } from '@nestjs/common'

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
  imports: [UserModule, AuthModule, MailModule],
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
  ]
})
export class SupportModule {}
