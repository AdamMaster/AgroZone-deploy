import { Module } from '@nestjs/common'
import { UserService } from './user.service'
import { UserController } from './user.controller'
import { FileModule } from '@/file/file.module'
import { PhoneConfirmationModule } from '@/libs/phone-confirmation/phone-confirmation.module'
import { MailModule } from '@/libs/mail/mail.module'

@Module({
  imports: [FileModule, MailModule, PhoneConfirmationModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService]
})
export class UserModule {}
