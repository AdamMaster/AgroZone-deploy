import { Module } from '@nestjs/common'
import { UserService } from './user.service'
import { UserController } from './user.controller'
import { FileModule } from '@/file/file.module'
import { ZvonokService } from '@/libs/zvonok/zvonok.service'
import { MailModule } from '@/libs/mail/mail.module'

@Module({
  imports: [FileModule, MailModule],
  controllers: [UserController],
  providers: [UserService, ZvonokService],
  exports: [UserService]
})
export class UserModule {}
