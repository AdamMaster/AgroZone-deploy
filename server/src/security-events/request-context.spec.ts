import type { Request, Response } from 'express'

import { UserRole } from '@/generated/prisma/enums'

import { getRequestMeta, requestContextMiddleware } from './request-context'

const runInRequest = <T>(req: unknown, fn: () => Promise<T> | T): Promise<T> =>
  new Promise((resolve, reject) => {
    requestContextMiddleware(req as Request, {} as Response, () => {
      Promise.resolve().then(fn).then(resolve, reject)
    })
  })

const makeReq = (overrides: Record<string, unknown> = {}) => ({
  ip: '203.0.113.7',
  socket: { remoteAddress: '10.0.0.1' },
  headers: { 'user-agent': 'jest-agent' },
  session: {},
  ...overrides
})

describe('request-context', () => {
  it('вне HTTP-запроса (cron, скрипт, тест) контекста нет', () => {
    expect(getRequestMeta()).toBeNull()
  })

  it('внутри запроса отдаёт IP и User-Agent', async () => {
    const meta = await runInRequest(makeReq(), () => getRequestMeta())

    expect(meta).toEqual({
      ip: '203.0.113.7',
      userAgent: 'jest-agent',
      actingUserId: null,
      actingUserRole: null
    })
  })

  it('контекст переживает await (в бизнес-логике запись идёт после обращений к базе)', async () => {
    const meta = await runInRequest(makeReq(), async () => {
      await new Promise(resolve => setTimeout(resolve, 5))
      await Promise.resolve()
      return getRequestMeta()
    })

    expect(meta?.ip).toBe('203.0.113.7')
  })

  it('параллельные запросы не видят контекст друг друга', async () => {
    const [first, second] = await Promise.all([
      runInRequest(makeReq({ ip: '198.51.100.1' }), async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return getRequestMeta()?.ip
      }),
      runInRequest(makeReq({ ip: '198.51.100.2' }), async () => {
        await new Promise(resolve => setTimeout(resolve, 1))
        return getRequestMeta()?.ip
      })
    ])

    expect([first, second]).toEqual(['198.51.100.1', '198.51.100.2'])
  })

  it('приводит IPv4 в IPv6-обёртке к обычному виду', async () => {
    const meta = await runInRequest(makeReq({ ip: '::ffff:203.0.113.7' }), () => getRequestMeta())

    expect(meta?.ip).toBe('203.0.113.7')
  })

  it('неизвестный IP отдаёт как null, а не строку "unknown"', async () => {
    const meta = await runInRequest(makeReq({ ip: undefined, socket: {} }), () => getRequestMeta())

    expect(meta?.ip).toBeNull()
  })

  it('читает "кто действует" из req.user, проставленного AuthGuard уже после middleware', async () => {
    const req: Record<string, unknown> = makeReq()

    const meta = await runInRequest(req, () => {
      req.user = { id: 'admin-1', role: UserRole.ADMIN }
      return getRequestMeta()
    })

    expect(meta?.actingUserId).toBe('admin-1')
    expect(meta?.actingUserRole).toBe(UserRole.ADMIN)
  })

  it('без req.user берёт владельца сессии (вход только что состоялся)', async () => {
    const meta = await runInRequest(makeReq({ session: { userId: 'user-9', userRole: UserRole.REGULAR } }), () =>
      getRequestMeta()
    )

    expect(meta?.actingUserId).toBe('user-9')
    expect(meta?.actingUserRole).toBe(UserRole.REGULAR)
  })

  it('req.user приоритетнее данных сессии', async () => {
    const meta = await runInRequest(
      makeReq({
        user: { id: 'from-guard', role: UserRole.ADMIN },
        session: { userId: 'from-session', userRole: UserRole.REGULAR }
      }),
      () => getRequestMeta()
    )

    expect(meta?.actingUserId).toBe('from-guard')
  })

  it('заголовок User-Agent не строка (массив/отсутствует) даёт null', async () => {
    const meta = await runInRequest(makeReq({ headers: {} }), () => getRequestMeta())

    expect(meta?.userAgent).toBeNull()
  })
})
