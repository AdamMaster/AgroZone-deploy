import 'express-session'

declare module 'express-session' {
  interface SessionData {
    userId?: string
    // CSRF-защита для OAuth-логина: одноразовое случайное значение,
    // которое кладём в сессию перед редиректом на провайдера и сверяем в callback.
    oauthState?: string
    // Id анонимного SupportGuest (см. schema.prisma и
    // SupportIdentityGuard.getOrCreateForSession) — благодаря
    // saveUninitialized: false (см. main.ts) cookie сессии реально
    // уезжает в браузер только в момент, когда это поле впервые
    // записывается, то есть когда посетитель первый раз тронул чат
    // поддержки, а не при обычном заходе на сайт.
    supportGuestId?: string
  }
}
