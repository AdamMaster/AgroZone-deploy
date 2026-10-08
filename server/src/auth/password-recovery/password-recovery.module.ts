import { Module } from '@nestjs/common'
import { PasswordRecoveryService } from './password-recovery.service'
import { PasswordRecoveryController } from './password-recovery.controller'
import { UserService } from '@/user/user.service'
import { MailService } from '@/libs/mail/mail.service'
import { PhoneConfirmationModule } from '@/libs/phone-confirmation/phone-confirmation.module'
import { RateLimitModule } from '@/libs/rate-limit/rate-limit.module'

@Module({
  imports: [PhoneConfirmationModule, RateLimitModule],
  controllers: [PasswordRecoveryController],
  providers: [PasswordRecoveryService, UserService, MailService]
})
export class PasswordRecoveryModule {}
