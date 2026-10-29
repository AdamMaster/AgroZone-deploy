import { Module } from '@nestjs/common'

import { AuthModule } from '@/auth/auth.module'
import { UserModule } from '@/user/user.module'

import { RegistrationAttemptsAdminController } from './registration-attempts-admin.controller'

// RegistrationAttemptsService приходит из глобального RegistrationAttemptsModule.
@Module({
  imports: [UserModule, AuthModule],
  controllers: [RegistrationAttemptsAdminController]
})
export class RegistrationAttemptsAdminModule {}
