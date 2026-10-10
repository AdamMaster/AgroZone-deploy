import type { RequestHandler } from 'express'
import type { Namespace } from 'socket.io'

import { SessionMiddlewareHolder } from '@/session/session-middleware.holder'

import type { SupportIdentityService } from './support-identity.service'
import { SupportGateway } from './support.gateway'

describe('SupportGateway.afterInit', () => {
  it('подключает к хэндшейку всю цепочку сессии по порядку: ключ приложения, затем express-session', () => {
    const holder = new SessionMiddlewareHolder()
    const tokenMiddleware: RequestHandler = (_req, _res, next) => next()
    const sessionMiddleware: RequestHandler = (_req, _res, next) => next()
    holder.set(tokenMiddleware, sessionMiddleware)

    const use = jest.fn()
    const namespace = { server: { engine: { use } } } as unknown as Namespace

    new SupportGateway({} as SupportIdentityService, holder).afterInit(namespace)

    expect(use.mock.calls).toEqual([[tokenMiddleware], [sessionMiddleware]])
  })
})
