import { Global, Module } from '@nestjs/common'

import { SecurityEventsService } from './security-events.service'
import { SecurityEventsRetentionWorker } from './workers/security-events-retention.worker'

// Глобальный (как PrismaModule): запись события безопасности нужна в
// десятке разных мест — UserService, AuthService, EmailChangeService,
// PasswordRecoveryService, — и импортировать модуль в каждый из них
// отдельно значило бы заодно протянуть циклические зависимости между
// auth/user модулями. HTTP-эндпоинты чтения журнала живут в UserController
// (users/admin/:id/security-events и users/profile/security-events) — это
// подресурсы пользователя, и так же устроены остальные админские действия.
@Global()
@Module({
  providers: [SecurityEventsService, SecurityEventsRetentionWorker],
  exports: [SecurityEventsService]
})
export class SecurityEventsModule {}
