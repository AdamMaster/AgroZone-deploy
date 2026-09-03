import { INestApplicationContext } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { ServerOptions } from 'socket.io'

// CORS для сокетов нельзя задать прямо в @WebSocketGateway({cors: {...}}) —
// декоратор выполняется в момент импорта класса, то есть ДО того, как
// ConfigModule.forRoot() (см. app.module.ts) успевает подгрузить .env через
// dotenv в дев-режиме: на проде ALLOWED_ORIGIN уже есть в process.env к
// старту процесса (docker-compose env_file), а в деве в момент выполнения
// декоратора его там ещё может не быть — багом это вылезет не сразу, а
// только на деве, и трудноуловимо. Кастомный адаптер строится в main.ts,
// когда ConfigService из DI уже точно инициализирован — единственное
// надёжное место для конфига, зависящего от окружения.
export class SupportIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly allowedOrigin: string
  ) {
    super(app)
  }

  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.allowedOrigin, credentials: true }
    })
  }
}
