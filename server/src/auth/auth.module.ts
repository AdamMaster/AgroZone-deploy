import { forwardRef, Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { UserService } from '@/user/user.service'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ProviderModule } from './provider/provider.module'
import { getProvidersConfig } from '@/config/providers.config'
import { EmailConfirmationModule } from './email-confirmation/email-confirmation.module'
import { MailService } from '@/libs/mail/mail.service'
import { TwoFactorAuthService } from './two-factor-auth/two-factor-auth.service'
import { PhoneConfirmationModule } from '@/libs/phone-confirmation/phone-confirmation.module'
import { SupportModule } from '@/support/support.module'
import { RedisModule } from '@/redis/redis.module'
import { MobileOAuthService } from './mobile-oauth/mobile-oauth.service'

@Module({
  imports: [
    PhoneConfirmationModule,
    // Хранилище state/ticket входа через соцсеть из приложения (MobileOAuthService).
    RedisModule,
    ProviderModule.registerAsync({
      imports: [ConfigModule],
      useFactory: getProvidersConfig,
      inject: [ConfigService]
    }),
    forwardRef(() => EmailConfirmationModule),
    // За SupportGuestsService — AuthService.saveSession приклеивает
    // гостевой чат поддержки к аккаунту при входе/регистрации (см. "Долг"
    // в ROADMAP.md). SupportModule сам импортирует AuthModule (декораторы
    // Authorization/CurrentUser в SupportController), отсюда forwardRef
    // на обеих сторонах.
    forwardRef(() => SupportModule)
  ],
  controllers: [AuthController],
  providers: [AuthService, UserService, MailService, TwoFactorAuthService, MobileOAuthService],
  exports: [AuthService]
})
export class AuthModule {}
