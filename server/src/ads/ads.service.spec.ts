import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'

import { AdsService } from './ads.service'
import { PrismaService } from '@/prisma/prisma.service'
import { FileService } from '../file/file.service'
import { ConfigService } from '@nestjs/config'
import { AdStateMachineService } from './ad-state-machine.service'
import { CategoriesService } from '@/categories/categories.service'
import { UserService } from '@/user/user.service'
import { NotificationsService } from '@/notifications/notifications.service'

// AdsService — большой сервис с семью зависимостями (см. конструктор), но
// на момент написания этого файла у него не было ни одного теста вообще.
// Не берём на себя переписывание/покрытие всего файла — тестируем только
// то, что реально добавили: setExpirationByAdmin и setCategoryByAdmin (см.
// ниже). Остальные зависимости — заглушки; categoriesService и
// prisma.category замоканы по-настоящему, потому что setCategoryByAdmin
// реально их использует (getFeatures/getCategoryPath/buildSeoPath,
// проверка листовой категории), а setExpirationByAdmin — только
// this.prisma, но TestingModule должен собрать граф целиком, поэтому
// остальным зависимостям достаточно пустых jest.fn()-объектов.
describe('AdsService', () => {
  let service: AdsService
  let prisma: any
  let categoriesService: any

  beforeEach(async () => {
    prisma = {
      ad: {
        findUnique: jest.fn(),
        update: jest.fn()
      },
      category: {
        findUnique: jest.fn()
      }
    }

    categoriesService = {
      getFeatures: jest.fn().mockResolvedValue([]),
      getCategoryPath: jest.fn().mockResolvedValue(['tehnika', 'traktory']),
      buildSeoPath: jest.fn((path: string[], slug: string) => [...path, slug].join('/'))
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FileService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn(), getOrThrow: jest.fn() } },
        { provide: AdStateMachineService, useValue: { canTransition: jest.fn(), transition: jest.fn() } },
        { provide: CategoriesService, useValue: categoriesService },
        { provide: UserService, useValue: {} },
        { provide: NotificationsService, useValue: {} }
      ]
    }).compile()

    service = module.get(AdsService)
  })

  describe('setExpirationByAdmin', () => {
    it('выбрасывает NotFoundException, если объявление не найдено', async () => {
      prisma.ad.findUnique.mockResolvedValue(null)

      await expect(service.setExpirationByAdmin('missing-ad', { expiresAt: '2099-01-01' })).rejects.toThrow(
        NotFoundException
      )
      expect(prisma.ad.update).not.toHaveBeenCalled()
    })

    it('задаёт expiresAt конкретной датой, не трогая статус, если объявление не PUBLISHED', async () => {
      prisma.ad.findUnique.mockResolvedValue({ id: 'ad-1', status: 'ARCHIVED' })

      await service.setExpirationByAdmin('ad-1', { expiresAt: '2099-01-01T00:00:00.000Z' })

      expect(prisma.ad.update).toHaveBeenCalledWith({
        where: { id: 'ad-1' },
        data: { expiresAt: new Date('2099-01-01T00:00:00.000Z') }
      })
    })

    it('expiresAt: null снимает срок жизни (объявление больше не истекает само)', async () => {
      prisma.ad.findUnique.mockResolvedValue({ id: 'ad-1', status: 'PUBLISHED' })

      await service.setExpirationByAdmin('ad-1', { expiresAt: null })

      expect(prisma.ad.update).toHaveBeenCalledWith({ where: { id: 'ad-1' }, data: { expiresAt: null } })
    })

    it('PUBLISHED + дата в прошлом сразу переводит в EXPIRED, не дожидаясь воркера', async () => {
      prisma.ad.findUnique.mockResolvedValue({ id: 'ad-1', status: 'PUBLISHED' })

      await service.setExpirationByAdmin('ad-1', { expiresAt: '2020-01-01T00:00:00.000Z' })

      expect(prisma.ad.update).toHaveBeenCalledWith({
        where: { id: 'ad-1' },
        data: { expiresAt: new Date('2020-01-01T00:00:00.000Z'), status: 'EXPIRED' }
      })
    })

    it('PUBLISHED + дата в будущем остаётся PUBLISHED, статус в data не передаётся', async () => {
      prisma.ad.findUnique.mockResolvedValue({ id: 'ad-1', status: 'PUBLISHED' })

      await service.setExpirationByAdmin('ad-1', { expiresAt: '2099-01-01T00:00:00.000Z' })

      expect(prisma.ad.update).toHaveBeenCalledWith({
        where: { id: 'ad-1' },
        data: { expiresAt: new Date('2099-01-01T00:00:00.000Z') }
      })
    })

    it('EXPIRED + дата в будущем НЕ возвращает статус в PUBLISHED (нужна повторная модерация)', async () => {
      prisma.ad.findUnique.mockResolvedValue({ id: 'ad-1', status: 'EXPIRED' })

      await service.setExpirationByAdmin('ad-1', { expiresAt: '2099-01-01T00:00:00.000Z' })

      expect(prisma.ad.update).toHaveBeenCalledWith({
        where: { id: 'ad-1' },
        data: { expiresAt: new Date('2099-01-01T00:00:00.000Z') }
      })
    })
  })

  describe('setCategoryByAdmin', () => {
    const oldAd = {
      id: 'ad-1',
      categoryId: 'cat-old',
      slug: 'traktor-abc123',
      features: { power: 95, power__unit: 'кВт', old_only_field: 'мусор от старой категории' }
    }

    // Листовая категория (children: 0) с явно заданными priceUnits — базовый
    // "счастливый путь" для большинства тестов ниже.
    const leafCategory = { id: 'cat-new', priceUnits: ['ITEM', 'TON'], _count: { children: 0 } }

    it('выбрасывает NotFoundException, если объявление не найдено', async () => {
      prisma.ad.findUnique.mockResolvedValue(null)

      await expect(service.setCategoryByAdmin('missing-ad', { categoryId: 'cat-new' })).rejects.toThrow(
        NotFoundException
      )
      expect(prisma.ad.update).not.toHaveBeenCalled()
    })

    it('выбрасывает NotFoundException, если категория не найдена', async () => {
      prisma.ad.findUnique.mockResolvedValue(oldAd)
      prisma.category.findUnique.mockResolvedValue(null)

      await expect(service.setCategoryByAdmin('ad-1', { categoryId: 'missing-cat' })).rejects.toThrow(NotFoundException)
      expect(prisma.ad.update).not.toHaveBeenCalled()
    })

    it('выбрасывает BadRequestException для промежуточной (не листовой) категории', async () => {
      prisma.ad.findUnique.mockResolvedValue(oldAd)
      prisma.category.findUnique.mockResolvedValue({ ...leafCategory, _count: { children: 3 } })

      await expect(service.setCategoryByAdmin('ad-1', { categoryId: 'cat-new' })).rejects.toThrow(BadRequestException)
      expect(prisma.ad.update).not.toHaveBeenCalled()
    })

    it('выбрасывает BadRequestException, если явно переданная unit недоступна для новой категории', async () => {
      prisma.ad.findUnique.mockResolvedValue(oldAd)
      prisma.category.findUnique.mockResolvedValue(leafCategory)

      await expect(service.setCategoryByAdmin('ad-1', { categoryId: 'cat-new', unit: 'KG' as any })).rejects.toThrow(
        BadRequestException
      )
      expect(prisma.ad.update).not.toHaveBeenCalled()
    })

    it('без явной unit по умолчанию берёт первую разрешённую единицу новой категории', async () => {
      prisma.ad.findUnique.mockResolvedValue(oldAd)
      prisma.category.findUnique.mockResolvedValue(leafCategory)

      await service.setCategoryByAdmin('ad-1', { categoryId: 'cat-new' })

      expect(prisma.ad.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'ad-1' }, data: expect.objectContaining({ unit: 'ITEM' }) })
      )
    })

    it('пересчитывает categoryPath/seoPath от новой категории, а не оставляет старые', async () => {
      prisma.ad.findUnique.mockResolvedValue(oldAd)
      prisma.category.findUnique.mockResolvedValue(leafCategory)
      categoriesService.getCategoryPath.mockResolvedValue(['oborudovanie', 'holodilnoe'])

      await service.setCategoryByAdmin('ad-1', { categoryId: 'cat-new' })

      expect(categoriesService.getCategoryPath).toHaveBeenCalledWith('cat-new')
      expect(categoriesService.buildSeoPath).toHaveBeenCalledWith(['oborudovanie', 'holodilnoe'], oldAd.slug)
      expect(prisma.ad.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            categoryId: 'cat-new',
            categoryPath: ['oborudovanie', 'holodilnoe'],
            seoPath: 'oborudovanie/holodilnoe/traktor-abc123'
          })
        })
      )
    })

    it('не трогает статус объявления — категорию меняет сам админ, повторная модерация не нужна', async () => {
      prisma.ad.findUnique.mockResolvedValue({ ...oldAd, status: 'PUBLISHED' })
      prisma.category.findUnique.mockResolvedValue(leafCategory)

      await service.setCategoryByAdmin('ad-1', { categoryId: 'cat-new' })

      const callArg = prisma.ad.update.mock.calls[0][0]
      expect(callArg.data).not.toHaveProperty('status')
    })

    it('если features переданы явно — оставляет только поля, реально принадлежащие новой категории', async () => {
      prisma.ad.findUnique.mockResolvedValue(oldAd)
      prisma.category.findUnique.mockResolvedValue(leafCategory)
      categoriesService.getFeatures.mockResolvedValue([{ name: 'capacity', type: 'NUMBER' }])

      await service.setCategoryByAdmin('ad-1', {
        categoryId: 'cat-new',
        features: { capacity: 500, capacity__unit: 'л', ghost_field_from_ui_bug: 'не должно попасть в базу' }
      })

      expect(prisma.ad.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ features: { capacity: 500, capacity__unit: 'л' } })
        })
      )
    })

    it('если features не переданы — реконсилит то, что уже было у объявления, между старой и новой категорией', async () => {
      prisma.ad.findUnique.mockResolvedValue(oldAd)
      prisma.category.findUnique.mockResolvedValue(leafCategory)
      categoriesService.getFeatures.mockImplementation((categoryId: string) =>
        Promise.resolve(
          categoryId === 'cat-old'
            ? [{ name: 'power', type: 'NUMBER' }]
            : [
                { name: 'power', type: 'NUMBER' },
                { name: 'depth', type: 'NUMBER' }
              ]
        )
      )

      await service.setCategoryByAdmin('ad-1', { categoryId: 'cat-new' })

      // "power"/"power__unit" совпадают по имени и типу в обеих категориях —
      // остаются; "old_only_field" (см. oldAd.features) — его нет в новой
      // категории вовсе, отбрасывается.
      expect(prisma.ad.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ features: { power: 95, power__unit: 'кВт' } })
        })
      )
    })
  })
})
