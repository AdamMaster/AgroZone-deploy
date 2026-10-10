import type { RequestHandler } from 'express'

import { SessionMiddlewareHolder } from './session-middleware.holder'

describe('SessionMiddlewareHolder', () => {
  it('отдаёт цепочку миддлварей в порядке установки', () => {
    const holder = new SessionMiddlewareHolder()
    const tokenMiddleware: RequestHandler = (_req, _res, next) => next()
    const sessionMiddleware: RequestHandler = (_req, _res, next) => next()

    holder.set(tokenMiddleware, sessionMiddleware)

    expect(holder.get()).toEqual([tokenMiddleware, sessionMiddleware])
  })

  it('падает, если цепочку прочитали до установки', () => {
    expect(() => new SessionMiddlewareHolder().get()).toThrow('middleware ещё не установлен')
  })
})
