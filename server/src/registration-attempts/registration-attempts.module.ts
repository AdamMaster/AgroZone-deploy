import { Global, Module } from '@nestjs/common'

import { RegistrationAttemptsService } from './registration-attempts.service'
import { RegistrationAttemptsRetentionWorker } from './workers/registration-attempts-retention.worker'

// Глобальный (как SecurityEventsModule): запись попытки нужна в AuthService и
// EmailConfirmationService, и импортировать модуль в каждый значило бы
// протянуть циклические зависимости между auth-модулями. Админская ручка
// вынесена в отдельный модуль (RegistrationAttemptsAdminModule): ей нужны
// UserModule и AuthModule для AuthGuard, а глобальному модулю их тянуть нельзя.
@Global()
@Module({
  providers: [RegistrationAttemptsService, RegistrationAttemptsRetentionWorker],
  exports: [RegistrationAttemptsService]
})
export class RegistrationAttemptsModule {}
