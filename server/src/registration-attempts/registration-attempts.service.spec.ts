import { Logger } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import {
  RegistrationAttemptStatus,
  RegistrationAttemptStep,
  RegistrationChannel,
  RegistrationFailureReason,
  RegistrationPlatform
} from '@/generated/prisma/enums'
import { PrismaService } from '@/prisma/prisma.service'
import { getRequestHeader, getRequestMeta } from '@/security-events/request-context'

import {
  REGISTRATION_ATTEMPTS_RETENTION_DAYS,
  REGISTRATION_ATTEMPT_ABANDON_AFTER_MS,
  REGISTRATION_ATTEMPT_MAX_DETAIL_LENGTH
} from './constants/registration-attempts.constants'
import { FindRegistrationAttemptsQueryDto } from './dto/find-registration-attempts-query.dto'
import { RegistrationAttemptsService, describeRegistrationError } from './registration-attempts.service'

// Сгенерированный клиент Prisma в jest без дополнительной настройки не
// грузится (import.meta), а тесту нужен только токен для DI — работу с базой
// подменяет mock ниже.
jest.mock('@/prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))
jest.mock('@/security-events/request-context', () => ({
  getRequestMeta: jest.fn(),
  getRequestHeader: jest.fn()
}))

const PHONE = { channel: RegistrationChannel.PHONE, contact: '79991234567' }
const EMAIL = { channel: RegistrationChannel.EMAIL, contact: 'Ivan@Example.com' }
const NOW = new Date('2026-10-29T12:00:00.000Z')

const query = (overrides: Partial<FindRegistrationAttemptsQueryDto> = {}): FindRegistrationAttemptsQueryDto =>
  Object.assign(new FindRegistrationAttemptsQueryDto(), overrides)

describe('RegistrationAttemptsService', () => {
  let service: RegistrationAttemptsService
  let prisma: any
  let loggerError: jest.SpyInstance

  beforeEach(async () => {
    prisma = {
      registrationAttempt: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 })
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      userPhone: { findMany: jest.fn().mockResolvedValue([]) }
    }
    ;(getRequestMeta as jest.Mock).mockReturnValue({
      ip: '203.0.113.7',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36',
      actingUserId: null,
      actingUserRole: null
    })
    ;(getRequestHeader as jest.Mock).mockReturnValue(null)
    loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)

    const module: TestingModule = await Test.createTestingModule({
      providers: [RegistrationAttemptsService, { provide: PrismaService, useValue: prisma }]
    }).compile()

    service = module.get(RegistrationAttemptsService)
  })

  afterEach(() => jest.restoreAllMocks())

  describe('progress', () => {
    it('заводит новую попытку с IP, устройством и платформой «сайт»', async () => {
      await service.progress(PHONE, RegistrationAttemptStep.CONFIRMATION_SENT)

      expect(prisma.registrationAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          channel: RegistrationChannel.PHONE,
          contact: '79991234567',
          platform: RegistrationPlatform.SITE,
          status: RegistrationAttemptStatus.IN_PROGRESS,
          step: RegistrationAttemptStep.CONFIRMATION_SENT,
          ip: '203.0.113.7',
          device: 'Chrome · Windows'
        })
      })
    })

    it('запрос приложения (X-Auth-Transport: token) помечается платформой «приложение»', async () => {
      ;(getRequestHeader as jest.Mock).mockReturnValue('token')

      await service.progress(PHONE, RegistrationAttemptStep.STARTED)

      expect(prisma.registrationAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ platform: RegistrationPlatform.APP })
      })
    })

    it('вне HTTP-запроса платформа неизвестна, а IP и устройства нет', async () => {
      ;(getRequestMeta as jest.Mock).mockReturnValue(null)

      await service.progress(PHONE, RegistrationAttemptStep.STARTED)

      expect(prisma.registrationAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ platform: RegistrationPlatform.UNKNOWN, ip: null, userAgent: null })
      })
    })

    it('продолжает открытую попытку, а не заводит вторую', async () => {
      prisma.registrationAttempt.findFirst.mockResolvedValue({ id: 'attempt-1' })

      await service.progress(PHONE, RegistrationAttemptStep.CONFIRMATION_SENT)

      expect(prisma.registrationAttempt.create).not.toHaveBeenCalled()
      expect(prisma.registrationAttempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-1' },
        data: { status: RegistrationAttemptStatus.IN_PROGRESS, step: RegistrationAttemptStep.CONFIRMATION_SENT }
      })
    })

    it('почту приводит к нижнему регистру и ищет открытую попытку только по каналу и контакту', async () => {
      await service.progress(EMAIL, RegistrationAttemptStep.CONFIRMATION_SENT)

      expect(prisma.registrationAttempt.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            channel: RegistrationChannel.EMAIL,
            contact: 'ivan@example.com',
            status: { not: RegistrationAttemptStatus.COMPLETED }
          })
        })
      )
    })
  })

  describe('fail', () => {
    it('без открытой попытки заводит запись с ошибкой', async () => {
      await service.fail(PHONE, RegistrationFailureReason.PROVIDER_ERROR, 'sms.ru недоступен')

      expect(prisma.registrationAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: RegistrationAttemptStatus.FAILED,
          failureReason: RegistrationFailureReason.PROVIDER_ERROR,
          failureDetail: 'sms.ru недоступен',
          failuresCount: 1
        })
      })
    })

    it('при открытой попытке обновляет её и увеличивает счётчик ошибок', async () => {
      prisma.registrationAttempt.findFirst.mockResolvedValue({ id: 'attempt-1' })

      await service.fail(PHONE, RegistrationFailureReason.CALL_NOT_RECEIVED)

      expect(prisma.registrationAttempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-1' },
        data: {
          status: RegistrationAttemptStatus.FAILED,
          failureReason: RegistrationFailureReason.CALL_NOT_RECEIVED,
          failureDetail: null,
          failuresCount: { increment: 1 }
        }
      })
    })

    it('createIfMissing=false: без открытой попытки ничего не пишет (вход не считается регистрацией)', async () => {
      await service.fail(PHONE, RegistrationFailureReason.CODE_INVALID, undefined, { createIfMissing: false })

      expect(prisma.registrationAttempt.create).not.toHaveBeenCalled()
      expect(prisma.registrationAttempt.update).not.toHaveBeenCalled()
    })

    it('длинный текст ошибки обрезается', async () => {
      await service.fail(PHONE, RegistrationFailureReason.UNKNOWN_ERROR, 'x'.repeat(5000))

      const { data } = prisma.registrationAttempt.create.mock.calls[0][0]

      expect(data.failureDetail).toHaveLength(REGISTRATION_ATTEMPT_MAX_DETAIL_LENGTH)
    })
  })

  describe('complete', () => {
    it('закрывает открытую попытку и привязывает аккаунт', async () => {
      prisma.registrationAttempt.findFirst.mockResolvedValue({ id: 'attempt-1' })

      await service.complete(PHONE, 'user-1')

      expect(prisma.registrationAttempt.update).toHaveBeenCalledWith({
        where: { id: 'attempt-1' },
        data: expect.objectContaining({
          status: RegistrationAttemptStatus.COMPLETED,
          step: RegistrationAttemptStep.COMPLETED,
          userId: 'user-1',
          completedAt: expect.any(Date)
        })
      })
    })

    it('createIfMissing=false: при обычном входе новую завершённую попытку не заводит', async () => {
      await service.complete(PHONE, 'user-1', { createIfMissing: false })

      expect(prisma.registrationAttempt.create).not.toHaveBeenCalled()
    })

    it('по умолчанию без открытой попытки записывает завершённую (старый клиент без старта)', async () => {
      await service.complete(PHONE, 'user-1')

      expect(prisma.registrationAttempt.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ status: RegistrationAttemptStatus.COMPLETED, userId: 'user-1' })
      })
    })
  })

  describe('сбой самого журнала', () => {
    it('не бросает исключение наружу, а пишет ошибку в лог', async () => {
      prisma.registrationAttempt.findFirst.mockRejectedValue(new Error('db down'))

      await expect(service.progress(PHONE, RegistrationAttemptStep.STARTED)).resolves.toBeUndefined()
      await expect(service.fail(PHONE, RegistrationFailureReason.UNKNOWN_ERROR)).resolves.toBeUndefined()
      await expect(service.complete(PHONE, 'user-1')).resolves.toBeUndefined()

      expect(loggerError).toHaveBeenCalledTimes(3)
    })
  })

  describe('findForAdmin', () => {
    const row = (overrides: Record<string, unknown> = {}) => ({
      id: 'a1',
      channel: RegistrationChannel.PHONE,
      contact: '79991234567',
      platform: RegistrationPlatform.SITE,
      status: RegistrationAttemptStatus.FAILED,
      step: RegistrationAttemptStep.STARTED,
      failureReason: RegistrationFailureReason.CALL_NOT_RECEIVED,
      failureDetail: null,
      failuresCount: 2,
      ip: '203.0.113.7',
      device: 'Chrome · Windows',
      createdAt: new Date('2026-10-29T11:00:00.000Z'),
      updatedAt: new Date('2026-10-29T11:30:00.000Z'),
      completedAt: null,
      ...overrides
    })

    it('по умолчанию показывает проблемные: ошибки и брошенные на полпути', async () => {
      await service.findForAdmin(query(), NOW)

      const { where } = prisma.registrationAttempt.findMany.mock.calls[0][0]

      expect(where).toEqual({
        AND: [
          {
            OR: [
              { status: RegistrationAttemptStatus.FAILED },
              {
                status: RegistrationAttemptStatus.IN_PROGRESS,
                updatedAt: { lt: new Date(NOW.getTime() - REGISTRATION_ATTEMPT_ABANDON_AFTER_MS) }
              }
            ]
          }
        ]
      })
    })

    it('фильтры «завершили» и «все», канал, платформа и поиск складываются', async () => {
      await service.findForAdmin(
        query({ filter: 'completed', channel: 'EMAIL', platform: 'APP', search: ' Ivan ' }),
        NOW
      )

      expect(prisma.registrationAttempt.findMany.mock.calls[0][0].where).toEqual({
        AND: [
          { status: RegistrationAttemptStatus.COMPLETED },
          { channel: 'EMAIL' },
          { platform: 'APP' },
          { contact: { contains: 'ivan', mode: 'insensitive' } }
        ]
      })

      await service.findForAdmin(query({ filter: 'all' }), NOW)

      expect(prisma.registrationAttempt.findMany.mock.calls[1][0].where).toEqual({})
    })

    it('телефон в поиске сводится к цифрам: вводят со скобками и пробелами, хранится без них', async () => {
      await service.findForAdmin(query({ filter: 'all', search: '+7 (999) 123' }), NOW)

      expect(prisma.registrationAttempt.findMany.mock.calls[0][0].where).toEqual({
        AND: [{ contact: { contains: '7999123', mode: 'insensitive' } }]
      })
    })

    it('«в процессе» без движения дольше срока показывается как брошенная', async () => {
      prisma.registrationAttempt.findMany.mockResolvedValue([
        row({
          id: 'old',
          status: RegistrationAttemptStatus.IN_PROGRESS,
          updatedAt: new Date(NOW.getTime() - REGISTRATION_ATTEMPT_ABANDON_AFTER_MS - 1000)
        }),
        row({
          id: 'fresh',
          status: RegistrationAttemptStatus.IN_PROGRESS,
          updatedAt: new Date(NOW.getTime() - 60_000)
        })
      ])

      const { items } = await service.findForAdmin(query(), NOW)

      expect(items.map(item => [item.id, item.status])).toEqual([
        ['old', 'ABANDONED'],
        ['fresh', RegistrationAttemptStatus.IN_PROGRESS]
      ])
    })

    it('отмечает, что человек всё же зарегистрировался: есть аккаунт с этим телефоном или почтой', async () => {
      prisma.registrationAttempt.findMany.mockResolvedValue([
        row({ id: 'phone-done' }),
        row({ id: 'phone-none', contact: '79990000000' }),
        row({ id: 'email-done', channel: RegistrationChannel.EMAIL, contact: 'ivan@example.com' }),
        row({ id: 'completed', status: RegistrationAttemptStatus.COMPLETED })
      ])
      prisma.userPhone.findMany.mockResolvedValue([{ phone: '79991234567' }])
      prisma.user.findMany.mockResolvedValue([{ email: 'Ivan@Example.com' }])

      const { items } = await service.findForAdmin(query({ filter: 'all' }), NOW)

      expect(items.map(item => [item.id, item.registeredLater])).toEqual([
        ['phone-done', true],
        ['phone-none', false],
        ['email-done', true],
        // Завершённая попытка — не «позже зарегистрировался», она и есть регистрация.
        ['completed', false]
      ])
    })

    it('отдаёт страницу, общее число и сводку за последние дни', async () => {
      prisma.registrationAttempt.count.mockResolvedValueOnce(45).mockResolvedValueOnce(10).mockResolvedValueOnce(4)
      prisma.registrationAttempt.count.mockResolvedValueOnce(2)

      const page = await service.findForAdmin(query({ page: 3, limit: 20 }), NOW)

      expect(prisma.registrationAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20, orderBy: { updatedAt: 'desc' } })
      )
      expect(page).toMatchObject({ page: 3, limit: 20 })
      expect(page.summary.days).toBe(7)
    })
  })

  describe('purgeExpired', () => {
    it('удаляет записи старше срока хранения пачками', async () => {
      prisma.registrationAttempt.findMany.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }])
      prisma.registrationAttempt.deleteMany.mockResolvedValueOnce({ count: 2 })

      await expect(service.purgeExpired(NOW)).resolves.toBe(2)

      expect(prisma.registrationAttempt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            updatedAt: { lt: new Date(NOW.getTime() - REGISTRATION_ATTEMPTS_RETENTION_DAYS * 24 * 60 * 60 * 1000) }
          }
        })
      )
      expect(prisma.registrationAttempt.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['a', 'b'] } } })
    })

    it('если удалять нечего — ничего не удаляет', async () => {
      await expect(service.purgeExpired(NOW)).resolves.toBe(0)

      expect(prisma.registrationAttempt.deleteMany).not.toHaveBeenCalled()
    })
  })
})

describe('describeRegistrationError', () => {
  it('берёт сообщение из ошибки и обрезает длинное', () => {
    expect(describeRegistrationError(new Error('boom'))).toBe('boom')
    expect(describeRegistrationError('строка')).toBe('строка')
    expect(describeRegistrationError(new Error('y'.repeat(1000)))).toHaveLength(REGISTRATION_ATTEMPT_MAX_DETAIL_LENGTH)
  })
})
