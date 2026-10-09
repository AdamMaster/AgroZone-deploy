import { Global, Module } from '@nestjs/common'

import { SessionMiddlewareHolder } from './session-middleware.holder'
import { SessionTokenService } from './session-token.service'

// @Global — SessionMiddlewareHolder нужен в SupportModule (см.
// support.gateway.ts), а завтра может понадобиться ещё где-то ещё, где
// сокеты авторизуются той же сессией; не заставляем каждый такой модуль
// явно импортировать SessionModule. SessionTokenService — выдача ключа
// сессии мобильному приложению (см. session-token.ts), нужен AuthService.
@Global()
@Module({
  providers: [SessionMiddlewareHolder, SessionTokenService],
  exports: [SessionMiddlewareHolder, SessionTokenService]
})
export class SessionModule {}
