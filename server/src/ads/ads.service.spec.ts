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
  let fileService: any
  let userService: any

  beforeEach(async () => {
    prisma = {
      ad: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      category: {
        findUnique: jest.fn()
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({ premiumUntil: null })
      }
    }

    fileService = {
      uploadFile: jest.fn(),
      deleteFileByUrl: jest.fn().mockResolvedValue(undefined)
    }
    userService = { findById: jest.fn() }

    categoriesService = {
      getFeatures: jest.fn().mockResolvedValue([]),
      getCategoryPath: jest.fn().mockResolvedValue(['tehnika', 'traktory']),
      buildSeoPath: jest.fn((path: string[], slug: string) => [...path, slug].join('/'))
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FileService, useValue: fileService },
        { provide: ConfigService, useValue: { get: jest.fn(), getOrThrow: jest.fn() } },
        { provide: AdStateMachineService, useValue: { canTransition: jest.fn(), transition: jest.fn() } },
        { provide: CategoriesService, useValue: categoriesService },
        { provide: UserService, useValue: userService },
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

  // ---------------------------------------------------------------------
  // Работа с файлами в S3: порядок «сначала БД — потом удаление файлов»,
  // откат загруженных файлов при сбое записи и защита от чужих ссылок в
  // existingImages (см. AdsService.saveWithImages).
  // ---------------------------------------------------------------------
  describe('фото в S3', () => {
    const OLD_A = 'https://cdn.example/ads/a.jpg'
    const OLD_B = 'https://cdn.example/ads/b.jpg'
    const NEW_URL = 'https://cdn.example/ads/new.jpg'
    const file = { originalname: 'new.jpg', buffer: Buffer.from('x'), mimetype: 'image/jpeg' } as Express.Multer.File

    const existingAd = {
      id: 'ad-1',
      userId: 'user-1',
      status: 'DRAFT',
      images: [OLD_A, OLD_B],
      slug: 'ad-abc',
      categoryPath: ['tehnika']
    }

    beforeEach(() => {
      prisma.ad.findFirst.mockResolvedValue(existingAd)
      prisma.ad.update.mockImplementation(({ data }: any) => Promise.resolve({ id: 'ad-1', ...data }))
      prisma.ad.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'ad-new', ...data }))
      fileService.uploadFile.mockResolvedValue({ url: NEW_URL, fileId: 'ads/new.jpg' })
    })

    describe('update', () => {
      it('удаляет из S3 только убранные фото и только после записи в БД', async () => {
        const order: string[] = []
        prisma.ad.update.mockImplementation(() => {
          order.push('db')
          return Promise.resolve({ id: 'ad-1' })
        })
        fileService.deleteFileByUrl.mockImplementation(() => {
          order.push('s3-delete')
          return Promise.resolve()
        })

        await service.update('ad-1', { existingImages: [OLD_A] } as any, 'user-1')

        expect(prisma.ad.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ images: [OLD_A] }) })
        )
        expect(fileService.deleteFileByUrl).toHaveBeenCalledTimes(1)
        expect(fileService.deleteFileByUrl).toHaveBeenCalledWith(OLD_B)
        expect(order).toEqual(['db', 's3-delete'])
      })

      it('не трогает фото, если existingImages не передан', async () => {
        await service.update('ad-1', { title: 'Новое название' } as any, 'user-1')

        expect(prisma.ad.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ images: [OLD_A, OLD_B] }) })
        )
        expect(fileService.deleteFileByUrl).not.toHaveBeenCalled()
      })

      it('при сбое записи в БД оставляет старые фото в S3 и удаляет только что загруженные', async () => {
        prisma.ad.update.mockRejectedValue(new Error('db down'))

        await expect(
          service.update('ad-1', { existingImages: [OLD_A] } as any, 'user-1', [file])
        ).rejects.toThrow('db down')

        expect(fileService.deleteFileByUrl).toHaveBeenCalledTimes(1)
        expect(fileService.deleteFileByUrl).toHaveBeenCalledWith(NEW_URL)
      })

      it('не загружает файлы и не трогает S3, если телефон некорректен', async () => {
        await expect(
          service.update('ad-1', { phone: 'abc', existingImages: [] } as any, 'user-1', [file])
        ).rejects.toThrow(BadRequestException)

        expect(fileService.uploadFile).not.toHaveBeenCalled()
        expect(fileService.deleteFileByUrl).not.toHaveBeenCalled()
        expect(prisma.ad.update).not.toHaveBeenCalled()
      })

      it('игнорирует в existingImages ссылки, которые не принадлежат объявлению (чужой файл не удаляется)', async () => {
        const foreign = 'https://cdn.example/ads/someone-elses.jpg'

        await service.update('ad-1', { existingImages: [OLD_A, foreign] } as any, 'user-1')

        expect(prisma.ad.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ images: [OLD_A] }) })
        )
        expect(fileService.deleteFileByUrl).toHaveBeenCalledTimes(1)
        expect(fileService.deleteFileByUrl).toHaveBeenCalledWith(OLD_B)
        expect(fileService.deleteFileByUrl).not.toHaveBeenCalledWith(foreign)
      })

      it('сбой удаления из S3 не ломает уже сохранённое объявление', async () => {
        fileService.deleteFileByUrl.mockRejectedValue(new Error('s3 down'))

        await expect(service.update('ad-1', { existingImages: [OLD_A] } as any, 'user-1')).resolves.toBeDefined()
      })

      it('если одна из загрузок упала — удаляет уже загруженные файлы и не пишет в БД', async () => {
        fileService.uploadFile
          .mockResolvedValueOnce({ url: NEW_URL, fileId: 'ads/new.jpg' })
          .mockRejectedValueOnce(new Error('upload failed'))

        await expect(service.update('ad-1', {} as any, 'user-1', [file, file])).rejects.toThrow('upload failed')

        expect(fileService.deleteFileByUrl).toHaveBeenCalledWith(NEW_URL)
        expect(prisma.ad.update).not.toHaveBeenCalled()
      })
    })

    describe('saveDraft', () => {
      beforeEach(() => {
        userService.findById.mockResolvedValue({ phones: [{ phone: '79991234567', isPrimary: true }] })
        categoriesService.getCategoryPath.mockResolvedValue(['tehnika'])
      })

      it('при обновлении черновика удаляет убранные фото из S3 после записи в БД', async () => {
        await service.saveDraft('user-1', { existingImages: [OLD_B], categoryId: 'cat-1' } as any, [], 'ad-1')

        expect(prisma.ad.update).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ images: [OLD_B] }) })
        )
        expect(fileService.deleteFileByUrl).toHaveBeenCalledWith(OLD_A)
      })

      it('при сбое создания черновика удаляет загруженные файлы', async () => {
        prisma.ad.create.mockRejectedValue(new Error('db down'))

        await expect(service.saveDraft('user-1', { categoryId: 'cat-1', title: 'Т' } as any, [file])).rejects.toThrow(
          'db down'
        )

        expect(fileService.deleteFileByUrl).toHaveBeenCalledWith(NEW_URL)
      })
    })

    describe('create', () => {
      beforeEach(() => {
        userService.findById.mockResolvedValue({ phones: [{ phone: '79991234567', isPrimary: true }] })
        prisma.category.findUnique.mockResolvedValue({ priceUnits: [] })
      })

      const dto = { title: 'Трактор', categoryId: 'cat-1', phone: '79991234567' } as any

      it('не принимает готовые ссылки из existingImages — у нового объявления только загруженные файлы', async () => {
        await service.create({ ...dto, existingImages: ['https://cdn.example/ads/foreign.jpg'] }, 'user-1', [file])

        expect(prisma.ad.create).toHaveBeenCalledWith(
          expect.objectContaining({ data: expect.objectContaining({ images: [NEW_URL] }) })
        )
      })

      it('при сбое записи в БД удаляет загруженные файлы', async () => {
        prisma.ad.create.mockRejectedValue(new Error('db down'))

        await expect(service.create(dto, 'user-1', [file])).rejects.toThrow('db down')

        expect(fileService.deleteFileByUrl).toHaveBeenCalledWith(NEW_URL)
      })

      it('не загружает файлы, если единица цены не подходит категории', async () => {
        prisma.category.findUnique.mockResolvedValue({ priceUnits: ['KG'] })

        await expect(service.create({ ...dto, unit: 'HOUR' }, 'user-1', [file])).rejects.toThrow(BadRequestException)

        expect(fileService.uploadFile).not.toHaveBeenCalled()
      })
    })

    describe('remove / removeByAdmin', () => {
      it('remove: сначала удаляет запись, затем все фото объявления из S3', async () => {
        const order: string[] = []
        prisma.ad.delete.mockImplementation(() => {
          order.push('db')
          return Promise.resolve({})
        })
        fileService.deleteFileByUrl.mockImplementation((url: string) => {
          order.push(url)
          return Promise.resolve()
        })

        await expect(service.remove('ad-1', 'user-1')).resolves.toEqual({ success: true })

        expect(order).toEqual(['db', OLD_A, OLD_B])
      })

      it('remove: если БД отказала — фото остаются в S3', async () => {
        prisma.ad.delete.mockRejectedValue(new Error('db down'))

        await expect(service.remove('ad-1', 'user-1')).rejects.toThrow('db down')

        expect(fileService.deleteFileByUrl).not.toHaveBeenCalled()
      })

      it('remove: сбой удаления файла не мешает успешному удалению объявления', async () => {
        fileService.deleteFileByUrl.mockRejectedValue(new Error('s3 down'))

        await expect(service.remove('ad-1', 'user-1')).resolves.toEqual({ success: true })
      })

      it('removeByAdmin: удаляет запись и все фото', async () => {
        prisma.ad.findUnique.mockResolvedValue(existingAd)

        await expect(service.removeByAdmin('ad-1')).resolves.toEqual({ success: true })

        expect(prisma.ad.delete).toHaveBeenCalledWith({ where: { id: 'ad-1' } })
        expect(fileService.deleteFileByUrl).toHaveBeenCalledTimes(2)
      })

      it('removeByAdmin: несуществующее объявление — 404 и никаких удалений', async () => {
        prisma.ad.findUnique.mockResolvedValue(null)

        await expect(service.removeByAdmin('ad-x')).rejects.toThrow(NotFoundException)

        expect(prisma.ad.delete).not.toHaveBeenCalled()
        expect(fileService.deleteFileByUrl).not.toHaveBeenCalled()
      })
    })
  })
})
