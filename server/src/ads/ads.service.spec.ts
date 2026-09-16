import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'

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
// то, что реально добавили (setExpirationByAdmin, см. ниже). Остальные шесть
// зависимостей здесь заглушки: setExpirationByAdmin использует только
// this.prisma, но TestingModule должен собрать граф целиком, поэтому им
// достаточно пустых jest.fn()-объектов, не полноценных моков.
describe('AdsService', () => {
  let service: AdsService
  let prisma: any

  beforeEach(async () => {
    prisma = {
      ad: {
        findUnique: jest.fn(),
        update: jest.fn()
      }
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdsService,
        { provide: PrismaService, useValue: prisma },
        { provide: FileService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn(), getOrThrow: jest.fn() } },
        { provide: AdStateMachineService, useValue: { canTransition: jest.fn(), transition: jest.fn() } },
        { provide: CategoriesService, useValue: {} },
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
})
