import { Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import type { Request, Response } from 'express'

import { SecurityEventActor, SecurityEventType, UserRole } from '@/generated/prisma/enums'
import { PrismaService } from '@/prisma/prisma.service'

import {
  SECURITY_EVENTS_DEFAULT_RETENTION_DAYS,
  SECURITY_EVENTS_MAX_USER_AGENT_LENGTH,
  SECURITY_EVENTS_PURGE_BATCH_SIZE
} from './constants/security-events.constants'
import { requestContextMiddleware } from './request-context'
import { SecurityEventsService } from './security-events.service'

// Сам PrismaService тянет за собой сгенерированный клиент, который в jest
// без дополнительной настройки не грузится (import.meta), а тесту нужен
// только токен для DI — реальную работу с базой подменяет mock ниже.
jest.mock('@/prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const runInRequest = <T>(req: unknown, fn: () => Promise<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    requestContextMiddleware(req as Request, {} as Response, () => {
      fn().then(resolve, reject)
    })
  })

const makeReq = (overrides: Record<string, unknown> = {}) => ({
  ip: '203.0.113.7',
  socket: { remoteAddress: '10.0.0.1' },
  headers: { 'user-agent': CHROME_WINDOWS },
  session: {},
  ...overrides
})

describe('SecurityEventsService', () => {
  let service: SecurityEventsService
  let prisma: any
  let configService: any
  let loggerError: jest.SpyInstance

  beforeEach(async () => {
    prisma = {
      userSecurityEvent: {
        create: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 })
      },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([])
      }
    }
    configService = { get: jest.fn() }
    loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityEventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService }
      ]
    }).compile()

    service = module.get(SecurityEventsService)
  })

  afterEach(() => {
    loggerError.mockRestore()
  })

  describe('record', () => {
    it('вне HTTP-запроса (cron, скрипт) пишет событие от SYSTEM без IP и устройства', async () => {
      await service.record({ userId: 'user-1', type: SecurityEventType.PASSWORD_CHANGED })

      expect(prisma.userSecurityEvent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: SecurityEventType.PASSWORD_CHANGED,
          actor: SecurityEventActor.SYSTEM,
          actorId: null,
          ip: null,
          userAgent: null,
          device: null
        }
      })
    })

    it('владелец аккаунта меняет своё: актор USER, IP и устройство берутся из запроса', async () => {
      await runInRequest(makeReq({ user: { id: 'user-1', role: UserRole.REGULAR } }), () =>
        service.record({
          userId: 'user-1',
          type: SecurityEventType.PASSWORD_CHANGED,
          metadata: { firstPassword: false }
        })
      )

      expect(prisma.userSecurityEvent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: SecurityEventType.PASSWORD_CHANGED,
          actor: SecurityEventActor.USER,
          actorId: null,
          ip: '203.0.113.7',
          userAgent: CHROME_WINDOWS,
          device: 'Chrome · Windows',
          metadata: { firstPassword: false }
        }
      })
    })

    it('админ действует над ЧУЖИМ аккаунтом: актор ADMIN с его id', async () => {
      await runInRequest(makeReq({ user: { id: 'admin-1', role: UserRole.ADMIN } }), () =>
        service.record({ userId: 'user-1', type: SecurityEventType.PASSWORD_SET_BY_ADMIN })
      )

      expect(prisma.userSecurityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actor: SecurityEventActor.ADMIN, actorId: 'admin-1' })
      })
    })

    it('админ действует над СВОИМ аккаунтом: это обычное действие владельца (USER)', async () => {
      await runInRequest(makeReq({ user: { id: 'admin-1', role: UserRole.ADMIN } }), () =>
        service.record({ userId: 'admin-1', type: SecurityEventType.PASSWORD_CHANGED })
      )

      expect(prisma.userSecurityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actor: SecurityEventActor.USER, actorId: null })
      })
    })

    it('анонимный запрос (сброс пароля по ссылке из письма) — актор USER', async () => {
      await runInRequest(makeReq(), () => service.record({ userId: 'user-1', type: SecurityEventType.PASSWORD_RESET }))

      expect(prisma.userSecurityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actor: SecurityEventActor.USER, actorId: null, ip: '203.0.113.7' })
      })
    })

    it('обычный пользователь (не админ) никогда не помечается как ADMIN', async () => {
      await runInRequest(makeReq({ user: { id: 'user-2', role: UserRole.REGULAR } }), () =>
        service.record({ userId: 'user-1', type: SecurityEventType.PASSWORD_CHANGED })
      )

      expect(prisma.userSecurityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actor: SecurityEventActor.USER, actorId: null })
      })
    })

    it('явно заданный актор SYSTEM перекрывает автоопределение даже внутри запроса', async () => {
      await runInRequest(makeReq({ session: { userId: 'user-1', userRole: UserRole.REGULAR } }), () =>
        service.record({ userId: 'user-1', type: SecurityEventType.ROLE_CHANGED, actor: SecurityEventActor.SYSTEM })
      )

      expect(prisma.userSecurityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ actor: SecurityEventActor.SYSTEM, actorId: null })
      })
    })

    it('обрезает чрезмерно длинный User-Agent', async () => {
      const hugeUserAgent = `${CHROME_WINDOWS} ${'x'.repeat(5000)}`

      await runInRequest(makeReq({ headers: { 'user-agent': hugeUserAgent } }), () =>
        service.record({ userId: 'user-1', type: SecurityEventType.PASSWORD_CHANGED })
      )

      const { userAgent } = prisma.userSecurityEvent.create.mock.calls[0][0].data
      expect(userAgent).toHaveLength(SECURITY_EVENTS_MAX_USER_AGENT_LENGTH)
    })

    it('НИКОГДА не бросает исключение: сбой записи журнала не должен ломать само действие', async () => {
      prisma.userSecurityEvent.create.mockRejectedValue(new Error('db is down'))

      await expect(
        service.record({ userId: 'user-1', type: SecurityEventType.PASSWORD_CHANGED })
      ).resolves.toBeUndefined()

      expect(loggerError).toHaveBeenCalledWith(
        expect.stringContaining('PASSWORD_CHANGED'),
        expect.stringContaining('db is down')
      )
    })
  })

  describe('recordLoginIfNew', () => {
    it('вне HTTP-запроса ничего не делает', async () => {
      await service.recordLoginIfNew('user-1', 'password')

      expect(prisma.userSecurityEvent.findFirst).not.toHaveBeenCalled()
      expect(prisma.userSecurityEvent.create).not.toHaveBeenCalled()
    })

    it('без IP и без распознанного устройства не пишет (отпечатка нет)', async () => {
      await runInRequest(makeReq({ ip: undefined, socket: {}, headers: {} }), () =>
        service.recordLoginIfNew('user-1', 'password')
      )

      expect(prisma.userSecurityEvent.findFirst).not.toHaveBeenCalled()
      expect(prisma.userSecurityEvent.create).not.toHaveBeenCalled()
    })

    it('вход с уже знакомого IP и устройства не пишется', async () => {
      prisma.userSecurityEvent.findFirst.mockResolvedValue({ id: 'seen' })

      await runInRequest(makeReq(), () => service.recordLoginIfNew('user-1', 'password'))

      expect(prisma.userSecurityEvent.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: { in: [SecurityEventType.LOGIN_NEW_DEVICE, SecurityEventType.ACCOUNT_REGISTERED] },
          ip: '203.0.113.7',
          device: 'Chrome · Windows'
        },
        select: { id: true }
      })
      expect(prisma.userSecurityEvent.create).not.toHaveBeenCalled()
    })

    it('вход с нового IP/устройства пишет LOGIN_NEW_DEVICE со способом входа', async () => {
      prisma.userSecurityEvent.findFirst.mockResolvedValue(null)

      await runInRequest(makeReq({ session: { userId: 'user-1', userRole: UserRole.REGULAR } }), () =>
        service.recordLoginIfNew('user-1', 'sms')
      )

      expect(prisma.userSecurityEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          type: SecurityEventType.LOGIN_NEW_DEVICE,
          actor: SecurityEventActor.USER,
          ip: '203.0.113.7',
          device: 'Chrome · Windows',
          metadata: { method: 'sms' }
        })
      })
    })

    it('сбой проверки не ломает вход: исключение не пробрасывается', async () => {
      prisma.userSecurityEvent.findFirst.mockRejectedValue(new Error('db is down'))

      await expect(
        runInRequest(makeReq(), () => service.recordLoginIfNew('user-1', 'password'))
      ).resolves.toBeUndefined()

      expect(loggerError).toHaveBeenCalled()
    })
  })

  describe('findForAdmin', () => {
    const row = (overrides: Record<string, unknown> = {}) => ({
      id: 'event-1',
      userId: 'user-1',
      type: SecurityEventType.PASSWORD_SET_BY_ADMIN,
      actor: SecurityEventActor.ADMIN,
      actorId: 'admin-1',
      ip: '203.0.113.7',
      userAgent: CHROME_WINDOWS,
      device: 'Chrome · Windows',
      metadata: null,
      createdAt: new Date('2026-10-01T10:00:00.000Z'),
      ...overrides
    })

    it('выбрасывает NotFoundException для несуществующего пользователя', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(service.findForAdmin('missing', {})).rejects.toThrow(NotFoundException)
      expect(prisma.userSecurityEvent.findMany).not.toHaveBeenCalled()
    })

    it('отдаёт полные данные и подставляет имя администратора', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
      prisma.userSecurityEvent.findMany.mockResolvedValue([row()])
      prisma.userSecurityEvent.count.mockResolvedValue(1)
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1', displayName: 'Адам' }])

      const result = await service.findForAdmin('user-1', {})

      expect(result).toEqual({
        items: [
          {
            id: 'event-1',
            type: SecurityEventType.PASSWORD_SET_BY_ADMIN,
            actor: SecurityEventActor.ADMIN,
            actorId: 'admin-1',
            actorName: 'Адам',
            ip: '203.0.113.7',
            userAgent: CHROME_WINDOWS,
            device: 'Chrome · Windows',
            metadata: null,
            createdAt: new Date('2026-10-01T10:00:00.000Z')
          }
        ],
        total: 1,
        page: 1,
        limit: 20
      })
    })

    it('имена админов запрашивает одним запросом на страницу и без дублей', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
      prisma.userSecurityEvent.findMany.mockResolvedValue([
        row({ id: 'e1' }),
        row({ id: 'e2' }),
        row({ id: 'e3', actorId: 'admin-2' })
      ])

      await service.findForAdmin('user-1', {})

      expect(prisma.user.findMany).toHaveBeenCalledTimes(1)
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['admin-1', 'admin-2'] } },
        select: { id: true, displayName: true }
      })
    })

    it('если в странице нет ADMIN-событий, лишний запрос имён не делается', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
      prisma.userSecurityEvent.findMany.mockResolvedValue([row({ actor: SecurityEventActor.USER, actorId: null })])

      const result = await service.findForAdmin('user-1', {})

      expect(prisma.user.findMany).not.toHaveBeenCalled()
      expect(result.items[0].actorName).toBeNull()
    })

    it('актор-админ не найден (аккаунт удалён) — actorName: null, а не ошибка', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })
      prisma.userSecurityEvent.findMany.mockResolvedValue([row()])
      prisma.user.findMany.mockResolvedValue([])

      const result = await service.findForAdmin('user-1', {})

      expect(result.items[0].actorName).toBeNull()
    })

    it('пагинация и фильтр по типам уходят в запрос; limit ограничен сотней', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })

      await service.findForAdmin('user-1', {
        page: 3,
        limit: 500,
        types: [SecurityEventType.PASSWORD_CHANGED, SecurityEventType.EMAIL_CHANGED]
      })

      expect(prisma.userSecurityEvent.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          type: { in: [SecurityEventType.PASSWORD_CHANGED, SecurityEventType.EMAIL_CHANGED] }
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 200,
        take: 100
      })
      expect(prisma.userSecurityEvent.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: { in: [SecurityEventType.PASSWORD_CHANGED, SecurityEventType.EMAIL_CHANGED] } }
      })
    })

    it('пустой список types не превращается в фильтр, отсекающий всё', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1' })

      await service.findForAdmin('user-1', { types: [] })

      expect(prisma.userSecurityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      )
    })
  })

  describe('findForUser', () => {
    it('не отдаёт пользователю User-Agent целиком и id администратора', async () => {
      prisma.userSecurityEvent.findMany.mockResolvedValue([
        {
          id: 'event-1',
          userId: 'user-1',
          type: SecurityEventType.PASSWORD_SET_BY_ADMIN,
          actor: SecurityEventActor.ADMIN,
          actorId: 'admin-1',
          ip: '203.0.113.7',
          userAgent: CHROME_WINDOWS,
          device: 'Chrome · Windows',
          metadata: null,
          createdAt: new Date('2026-10-01T10:00:00.000Z')
        }
      ])
      prisma.userSecurityEvent.count.mockResolvedValue(1)

      const result = await service.findForUser('user-1', {})

      expect(result.items[0]).toEqual({
        id: 'event-1',
        type: SecurityEventType.PASSWORD_SET_BY_ADMIN,
        actor: SecurityEventActor.ADMIN,
        ip: '203.0.113.7',
        device: 'Chrome · Windows',
        metadata: null,
        createdAt: new Date('2026-10-01T10:00:00.000Z')
      })
      expect(result.items[0]).not.toHaveProperty('userAgent')
      expect(result.items[0]).not.toHaveProperty('actorId')
      expect(prisma.user.findMany).not.toHaveBeenCalled()
    })

    it('читает только события самого пользователя (userId в where)', async () => {
      await service.findForUser('user-1', {})

      expect(prisma.userSecurityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      )
    })
  })

  describe('getRetentionDays', () => {
    it.each([
      [undefined, SECURITY_EVENTS_DEFAULT_RETENTION_DAYS],
      ['30', 30],
      ['7.9', 7],
      ['abc', SECURITY_EVENTS_DEFAULT_RETENTION_DAYS],
      ['0', SECURITY_EVENTS_DEFAULT_RETENTION_DAYS],
      ['-5', SECURITY_EVENTS_DEFAULT_RETENTION_DAYS],
      ['', SECURITY_EVENTS_DEFAULT_RETENTION_DAYS]
    ])('SECURITY_EVENTS_RETENTION_DAYS=%p → %p дней', (configured, expected) => {
      configService.get.mockReturnValue(configured)

      expect(service.getRetentionDays()).toBe(expected)
    })
  })

  describe('purgeExpired', () => {
    const now = new Date('2026-10-04T03:30:00.000Z')

    it('ничего не удаляет, если просроченных записей нет', async () => {
      prisma.userSecurityEvent.findMany.mockResolvedValue([])

      await expect(service.purgeExpired(now)).resolves.toBe(0)
      expect(prisma.userSecurityEvent.deleteMany).not.toHaveBeenCalled()
    })

    it('удаляет записи старше срока хранения (по умолчанию 365 дней)', async () => {
      prisma.userSecurityEvent.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }])
      prisma.userSecurityEvent.deleteMany.mockResolvedValue({ count: 2 })

      const deleted = await service.purgeExpired(now)

      const expectedCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      expect(prisma.userSecurityEvent.findMany).toHaveBeenCalledWith({
        where: { createdAt: { lt: expectedCutoff } },
        select: { id: true },
        take: SECURITY_EVENTS_PURGE_BATCH_SIZE
      })
      expect(prisma.userSecurityEvent.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['a', 'b'] } } })
      expect(deleted).toBe(2)
    })

    it('срок хранения берётся из конфигурации', async () => {
      configService.get.mockReturnValue('90')
      prisma.userSecurityEvent.findMany.mockResolvedValue([])

      await service.purgeExpired(now)

      const expectedCutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      expect(prisma.userSecurityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdAt: { lt: expectedCutoff } } })
      )
    })

    it('идёт пачками, пока не опустошит очередь, и суммирует удалённое', async () => {
      const fullBatch = Array.from({ length: SECURITY_EVENTS_PURGE_BATCH_SIZE }, (_, index) => ({ id: `id-${index}` }))
      prisma.userSecurityEvent.findMany
        .mockResolvedValueOnce(fullBatch)
        .mockResolvedValueOnce(fullBatch)
        .mockResolvedValueOnce([{ id: 'last' }])
      prisma.userSecurityEvent.deleteMany
        .mockResolvedValueOnce({ count: SECURITY_EVENTS_PURGE_BATCH_SIZE })
        .mockResolvedValueOnce({ count: SECURITY_EVENTS_PURGE_BATCH_SIZE })
        .mockResolvedValueOnce({ count: 1 })

      const deleted = await service.purgeExpired(now)

      expect(prisma.userSecurityEvent.findMany).toHaveBeenCalledTimes(3)
      expect(deleted).toBe(SECURITY_EVENTS_PURGE_BATCH_SIZE * 2 + 1)
    })
  })
})
