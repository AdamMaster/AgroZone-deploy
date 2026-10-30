import { Module } from '@nestjs/common'

import { AuthModule } from '@/auth/auth.module'
import { BlockedUsersModule } from '@/blocked-users/blocked-users.module'
import { NotificationsModule } from '@/notifications/notifications.module'
import { PushModule } from '@/push/push.module'
import { PrismaService } from '@/prisma/prisma.service'
import { UserModule } from '@/user/user.module'

import { ChatEmailRemindersService } from './chat-email-reminders.service'
import { ConversationsPushListener } from './conversations-push.listener'
import { ConversationsController } from './conversations.controller'
import { ConversationsGateway } from './conversations.gateway'
import { ConversationsService } from './conversations.service'
import { ChatEmailRemindersWorker } from './workers/chat-email-reminders.worker'

@Module({
  imports: [UserModule, AuthModule, BlockedUsersModule, NotificationsModule, PushModule],
  controllers: [ConversationsController],
  providers: [
    ConversationsService,
    ConversationsGateway,
    ConversationsPushListener,
    ChatEmailRemindersService,
    ChatEmailRemindersWorker,
    PrismaService
  ]
})
export class ConversationsModule {}
