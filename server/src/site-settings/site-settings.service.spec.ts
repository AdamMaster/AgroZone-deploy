import { Logger } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'

import { PrismaService } from '@/prisma/prisma.service'
import { RedisService } from '@/redis/redis.service'

import {
  SITE_FLAG_DEFAULTS,
  SITE_FLAG_KEYS,
  SITE_SETTINGS_CACHE_KEY,
  SITE_SETTINGS_CACHE_TTL_SECONDS,
  SITE_SETTINGS_HISTORY_LIMIT,
  SiteFlagKey
} from './constants/site-flags.constants'
import { SiteSettingsService } from './site-settings.service'

// Сгенерированный клиент Prisma в jest без дополнительной настройки не
// грузится (import.meta), а тесту нужен только токен для DI — работу с базой
// подменяет mock ниже.
jest.mock('@/prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))
jest.mock('@/redis/redis.service', () => ({ RedisService: class RedisService {} }))

const KEY = SiteFlagKey.SellerRatings
const ADMIN = { id: 'admin-1', displayName: 'Админ' }
const CHANGED_AT = new Date('2026-10-26T12:00:00.000Z')

describe('SiteSettingsService', () => {
  let service: SiteSettingsService
  let prisma: any
  let redis: any
  let loggerWarn: jest.SpyInstance
  let loggerError: jest.SpyInstance

  beforeEach(async () => {
    prisma = {
      siteSetting: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockReturnValue('upsert-op')
      },
      siteSettingChange: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockReturnValue('create-op')
      },
      $transaction: jest.fn().mockResolvedValue([])
    }
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined)
    }
    loggerWarn = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined)
    loggerError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteSettingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis }
      ]
    }).compile()

    service = module.get(SiteSettingsService)
  })

  afterEach(() => jest.restoreAllMocks())

  describe('getFlags', () => {
    it('по умолчанию все флаги выключены, а пустой ответ базы кешируется', async () => {
      await expect(service.getFlags()).resolves.toEqual({ ...SITE_FLAG_DEFAULTS })

      expect(redis.set).toHaveBeenCalledWith(
        SITE_SETTINGS_CACHE_KEY,
        { ...SITE_FLAG_DEFAULTS },
        SITE_SETTINGS_CACHE_TTL_SECONDS
      )
    })

    it('значение из базы переопределяет значение по умолчанию', async () => {
      prisma.siteSetting.findMany.mockResolvedValue([{ key: KEY, value: true }])

      await expect(service.getFlags()).resolves.toEqual({ ...SITE_FLAG_DEFAULTS, [KEY]: true })
      expect(redis.set).toHaveBeenCalledWith(
        SITE_SETTINGS_CACHE_KEY,
        { ...SITE_FLAG_DEFAULTS, [KEY]: true },
        SITE_SETTINGS_CACHE_TTL_SECONDS
      )
    })

    it('строки с неизвестными ключами игнорируются', async () => {
      prisma.siteSetting.findMany.mockResolvedValue([{ key: 'removedFlag', value: true }])

      const flags = await service.getFlags()

      expect(flags).toEqual({ ...SITE_FLAG_DEFAULTS })
      expect(flags).not.toHaveProperty('removedFlag')
    })

    it('при попадании в кеш базу не читает', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ [KEY]: true }))

      await expect(service.getFlags()).resolves.toEqual({ ...SITE_FLAG_DEFAULTS, [KEY]: true })

      expect(prisma.siteSetting.findMany).not.toHaveBeenCalled()
      expect(redis.set).not.toHaveBeenCalled()
    })

    it('кеш со старым набором флагов дополняется значениями по умолчанию', async () => {
      redis.get.mockResolvedValue(JSON.stringify({ removedFlag: true }))

      await expect(service.getFlags()).resolves.toEqual({ ...SITE_FLAG_DEFAULTS })
    })

    it.each([
      ['не JSON', '{oops'],
      ['не объект', '42'],
      ['null', 'null']
    ])('битый кеш (%s) не ломает ответ: читает базу', async (_name, raw) => {
      redis.get.mockResolvedValue(raw)
      prisma.siteSetting.findMany.mockResolvedValue([{ key: KEY, value: true }])

      await expect(service.getFlags()).resolves.toEqual({ ...SITE_FLAG_DEFAULTS, [KEY]: true })
      expect(prisma.siteSetting.findMany).toHaveBeenCalledTimes(1)
    })

    it('недоступный Redis не ломает ответ: читает базу и пишет предупреждение', async () => {
      redis.get.mockRejectedValue(new Error('redis down'))
      redis.set.mockRejectedValue(new Error('redis down'))
      prisma.siteSetting.findMany.mockResolvedValue([{ key: KEY, value: true }])

      await expect(service.getFlags()).resolves.toEqual({ ...SITE_FLAG_DEFAULTS, [KEY]: true })
      expect(loggerWarn).toHaveBeenCalledTimes(2)
    })
  })

  describe('update', () => {
    it('смена значения: одна транзакция из переопределения и записи в журнал, затем сброс кеша', async () => {
      prisma.siteSetting.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ key: KEY, value: true, updatedAt: CHANGED_AT, updatedBy: ADMIN })

      const result = await service.update(KEY, true, ADMIN.id)

      expect(prisma.siteSetting.upsert).toHaveBeenCalledWith({
        where: { key: KEY },
        create: { key: KEY, value: true, updatedById: ADMIN.id },
        update: { value: true, updatedById: ADMIN.id }
      })
      expect(prisma.siteSettingChange.create).toHaveBeenCalledWith({
        data: { key: KEY, value: true, changedById: ADMIN.id }
      })
      expect(prisma.$transaction).toHaveBeenCalledWith(['upsert-op', 'create-op'])
      expect(redis.del).toHaveBeenCalledWith(SITE_SETTINGS_CACHE_KEY)
      expect(result).toEqual({ key: KEY, value: true, updatedAt: CHANGED_AT, updatedBy: ADMIN })
    })

    it('выключение ранее включённого флага тоже фиксируется', async () => {
      prisma.siteSetting.findUnique
        .mockResolvedValueOnce({ value: true })
        .mockResolvedValueOnce({ key: KEY, value: false, updatedAt: CHANGED_AT, updatedBy: ADMIN })

      const result = await service.update(KEY, false, ADMIN.id)

      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
      expect(result.value).toBe(false)
    })

    it('значение, совпадающее с умолчанием при отсутствии строки, — не изменение', async () => {
      const result = await service.update(KEY, SITE_FLAG_DEFAULTS[KEY], ADMIN.id)

      expect(prisma.$transaction).not.toHaveBeenCalled()
      expect(redis.del).not.toHaveBeenCalled()
      expect(result).toEqual({ key: KEY, value: false, updatedAt: null, updatedBy: null })
    })

    it('повторная установка текущего значения — не изменение: журнал и кеш не трогаем', async () => {
      const row = { key: KEY, value: true, updatedAt: CHANGED_AT, updatedBy: ADMIN }
      prisma.siteSetting.findUnique.mockResolvedValue(row)

      const result = await service.update(KEY, true, ADMIN.id)

      expect(prisma.$transaction).not.toHaveBeenCalled()
      expect(redis.del).not.toHaveBeenCalled()
      expect(result).toEqual(row)
    })

    it('сбой сброса кеша не откатывает изменение, но попадает в лог ошибок', async () => {
      redis.del.mockRejectedValue(new Error('redis down'))
      prisma.siteSetting.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ key: KEY, value: true, updatedAt: CHANGED_AT, updatedBy: ADMIN })

      await expect(service.update(KEY, true, ADMIN.id)).resolves.toMatchObject({ value: true })
      expect(loggerError).toHaveBeenCalledTimes(1)
    })

    it('сбой транзакции пробрасывается и кеш не сбрасывается', async () => {
      prisma.$transaction.mockRejectedValue(new Error('db down'))

      await expect(service.update(KEY, true, ADMIN.id)).rejects.toThrow('db down')
      expect(redis.del).not.toHaveBeenCalled()
    })
  })

  describe('getAdminSettings', () => {
    it('без переопределений отдаёт все флаги из реестра со значениями по умолчанию', async () => {
      await expect(service.getAdminSettings()).resolves.toEqual({
        flags: SITE_FLAG_KEYS.map(key => ({ key, value: SITE_FLAG_DEFAULTS[key], updatedAt: null, updatedBy: null })),
        changes: []
      })
    })

    it('отдаёт переопределение с автором и последние изменения, а неизвестные ключи отбрасывает', async () => {
      prisma.siteSetting.findMany.mockResolvedValue([
        { key: KEY, value: true, updatedAt: CHANGED_AT, updatedBy: ADMIN },
        { key: 'removedFlag', value: true, updatedAt: CHANGED_AT, updatedBy: ADMIN }
      ])
      prisma.siteSettingChange.findMany.mockResolvedValue([
        { id: 'c1', key: KEY, value: true, createdAt: CHANGED_AT, changedBy: ADMIN },
        { id: 'c2', key: 'removedFlag', value: false, createdAt: CHANGED_AT, changedBy: null }
      ])

      const result = await service.getAdminSettings()

      expect(result.flags).toHaveLength(SITE_FLAG_KEYS.length)
      expect(result.flags.find(flag => flag.key === KEY)).toEqual({
        key: KEY,
        value: true,
        updatedAt: CHANGED_AT,
        updatedBy: ADMIN
      })
      expect(result.changes).toEqual([{ id: 'c1', key: KEY, value: true, createdAt: CHANGED_AT, changedBy: ADMIN }])
      expect(prisma.siteSettingChange.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { createdAt: 'desc' }, take: SITE_SETTINGS_HISTORY_LIMIT })
      )
    })

    it('кеш не используется: администратор видит то, что в базе', async () => {
      await service.getAdminSettings()

      expect(redis.get).not.toHaveBeenCalled()
    })
  })
})
