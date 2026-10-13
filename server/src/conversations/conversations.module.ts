import { Module } from '@nestjs/common'

import { AuthModule } from '@/auth/auth.module'
import { BlockedUsersModule } from '@/blocked-users/blocked-users.module'
import { NotificationsModule } from '@/notifications/notifications.module'
import { PrismaService } from '@/prisma/prisma.service'
import { UserModule } from '@/user/user.module'

import { ConversationsController } from './conversations.controller'
import { ConversationsGateway } from './conversations.gateway'
import { ConversationsService } from './conversations.service'

@Module({
  imports: [UserModule, AuthModule, BlockedUsersModule, NotificationsModule],
  controllers: [ConversationsController],
  providers: [ConversationsService, ConversationsGateway, PrismaService]
})
export class ConversationsModule {}
