import { Global, Module } from '@nestjs/common'

import { SessionMiddlewareHolder } from './session-middleware.holder'

// @Global — SessionMiddlewareHolder нужен в SupportModule (см.
// support.gateway.ts), а завтра может понадобиться ещё где-то ещё, где
// сокеты авторизуются той же сессией; не заставляем каждый такой модуль
// явно импортировать SessionModule.
@Global()
@Module({
  providers: [SessionMiddlewareHolder],
  exports: [SessionMiddlewareHolder]
})
export class SessionModule {}
