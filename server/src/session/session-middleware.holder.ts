import { Injectable } from '@nestjs/common'
import { RequestHandler } from 'express'

// Мост между main.ts (там реально собирается express-session — вместе с
// Redis-клиентом под сессии, см. bootstrap()) и остальным DI-графом Nest,
// которому та же самая миддлварь нужна ещё в одном месте — в
// SupportGateway, чтобы разобрать cookie сессии прямо на хэндшейке сокета
// (см. support.gateway.ts и https://socket.io/how-to/use-with-express-session).
//
// Намеренно не пересобираем session(...) второй раз с тем же конфигом
// (secret, store, cookie) в двух местах — один инстанс, один источник
// истины, никакого риска, что HTTP- и WS-сессии однажды разъедутся по
// конфигу. main.ts один раз кладёт сюда уже готовый экземпляр (после
// app.use(sessionMiddleware), до app.listen()), SupportGateway читает его
// в afterInit.
@Injectable()
export class SessionMiddlewareHolder {
  private middleware?: RequestHandler

  set(middleware: RequestHandler) {
    this.middleware = middleware
  }

  get(): RequestHandler {
    if (!this.middleware) {
      // Означает, что кто-то прочитал holder раньше, чем main.ts успел
      // вызвать .set() (то есть до app.use(session(...)) в bootstrap()).
      // Порядок в main.ts специально соблюдён так, чтобы этого не
      // случалось — если всё же попали сюда, лучше явно упасть на старте,
      // чем молча слушать сокеты без сессии (а значит — без возможности
      // отличить юзера от гостя, от админа).
      throw new Error('SessionMiddlewareHolder: middleware ещё не установлен — проверьте порядок вызовов в main.ts')
    }

    return this.middleware
  }
}
