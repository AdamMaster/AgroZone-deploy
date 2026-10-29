import { Module } from '@nestjs/common'

import { AuthModule } from '@/auth/auth.module'
import { PrismaService } from '@/prisma/prisma.service'
import { UserModule } from '@/user/user.module'

import { RuStorePushSender } from './providers/rustore-push.sender'
import { PushController } from './push.controller'
import { PushService } from './push.service'

@Module({
  imports: [UserModule, AuthModule],
  controllers: [PushController],
  providers: [PushService, RuStorePushSender, PrismaService],
  exports: [PushService]
})
export class PushModule {}
