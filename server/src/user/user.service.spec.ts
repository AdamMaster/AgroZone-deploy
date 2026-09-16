import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import * as argon2 from 'argon2'

import { UserService } from './user.service'
import { PrismaService } from '@/prisma/prisma.service'
import { FileService } from '../file/file.service'
import { ConfigService } from '@nestjs/config'
import { ZvonokService } from '@/libs/zvonok/zvonok.service'
import { TokenType } from '@/generated/prisma/enums'

jest.mock('argon2')

const mockedVerify = argon2.verify as jest.MockedFunction<typeof argon2.verify>
const mockedHash = argon2.hash as jest.MockedFunction<typeof argon2.hash>

describe('UserService', () => {
  let service: UserService
  let prisma: any
  let fileService: any
  let configService: any
  let zvonokService: any

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn()
      },
      userPhone: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        count: jest.fn()
      },
      token: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn()
      }
    }
    // $transaction в реальном коде даёт колбэку транзакционный клиент — в
    // тестах подсовываем тот же mock-объект, методы внутри транзакции те же.
    prisma.$transaction = jest.fn(async (cb: any) => cb(prisma))

    fileService = {}
    configService = { get: jest.fn(), getOrThrow: jest.fn() }
    zvonokService = {
      requestCallbackConfirmation: jest.fn(),
      checkCallbackConfirmed: jest.fn()
    }

    mockedVerify.mockReset()
    mockedHash.mockReset()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prisma },
        { provide: FileService, useValue: fileService },
        { provide: ConfigService, useValue: configService },
        { provide: ZvonokService, useValue: zvonokService }
      ]
    }).compile()

    service = module.get(UserService)
  })

  // ---------------------------------------------------------------------
  // Смена пароля: два разных сценария в одном методе — обычная смена
  // (нужен текущий пароль) и первичная установка пароля для OAuth-only
  // аккаунта (Яндекс), у которого пароля ещё нет.
  // ---------------------------------------------------------------------
  describe('updatePassword', () => {
    it('выбрасывает NotFoundException, если пользователь не найден', async () => {
      prisma.user.findUnique.mockResolvedValue(null)

      await expect(service.updatePassword('missing-user', { newPassword: 'newpass1' } as any)).rejects.toThrow(
        NotFoundException
      )
    })

    it('для OAuth-аккаунта без пароля устанавливает первый пароль напрямую, без проверки currentPassword', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: null })
      mockedHash.mockResolvedValue('hashed-new-password' as any)

      await service.updatePassword('user-1', { newPassword: 'newpass1' } as any)

      expect(mockedVerify).not.toHaveBeenCalled()
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'hashed-new-password' }
      })
    })

    it('для аккаунта с паролем требует currentPassword и отклоняет запрос без него', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'old-hash' })

      await expect(service.updatePassword('user-1', { newPassword: 'newpass1' } as any)).rejects.toThrow(
        'Необходимо указать текущий пароль'
      )
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('отклоняет смену пароля при неверном текущем пароле', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'old-hash' })
      mockedVerify.mockResolvedValue(false)

      await expect(
        service.updatePassword('user-1', { currentPassword: 'wrong', newPassword: 'newpass1' } as any)
      ).rejects.toThrow('Текущий пароль указан неверно')
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('меняет пароль при верном текущем пароле', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', password: 'old-hash' })
      mockedVerify.mockResolvedValue(true)
      mockedHash.mockResolvedValue('hashed-new-password' as any)

      await service.updatePassword('user-1', { currentPassword: 'correct', newPassword: 'newpass1' } as any)

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'hashed-new-password' }
      })
    })
  })

  // ---------------------------------------------------------------------
  // Смена ОСНОВНОГО номера телефона (заменяет существующий)
  // ---------------------------------------------------------------------
  describe('requestPhoneChange (общий "запрос" для смены и для добавления номера)', () => {
    it('отклоняет, если номер уже привязан к ЭТОМУ ЖЕ аккаунту', async () => {
      prisma.userPhone.findUnique.mockResolvedValue({ userId: 'user-1' })

      await expect(service.requestPhoneChange('user-1', '+79991234567')).rejects.toThrow(
        'Этот номер уже добавлен в ваш аккаунт'
      )
    })

    it('отклоняет, если номер занят ДРУГИМ аккаунтом', async () => {
      prisma.userPhone.findUnique.mockResolvedValue({ userId: 'other-user' })

      await expect(service.requestPhoneChange('user-1', '+79991234567')).rejects.toThrow(
        'Этот номер уже используется другим аккаунтом'
      )
    })

    it('при свободном номере запрашивает звонок и сохраняет токен PHONE_CHANGE', async () => {
      prisma.userPhone.findUnique.mockResolvedValue(null)
      zvonokService.requestCallbackConfirmation.mockResolvedValue({ callId: 'call-1', number: '+7 930 555-86-07' })

      const result = await service.requestPhoneChange('user-1', '+79991234567')

      expect(prisma.token.deleteMany).toHaveBeenCalledWith({ where: { userId: 'user-1', type: 'PHONE_CHANGE' } })
      expect(prisma.token.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ token: 'call-1', type: 'PHONE_CHANGE', userId: 'user-1', phone: '79991234567' })
        })
      )
      expect(result).toEqual({ success: true, callNumber: '+7 930 555-86-07' })
    })
  })

  describe('checkPhoneCallbackStatus (общий опрос для обеих систем управления телефоном)', () => {
    it('сообщает, что код не запрошен', async () => {
      prisma.token.findFirst.mockResolvedValue(null)

      await expect(service.checkPhoneCallbackStatus('user-1')).rejects.toThrow(
        'Код подтверждения не запрошен. Запросите новый.'
      )
    })

    it('удаляет токен и сообщает об истечении при просрочке', async () => {
      prisma.token.findFirst.mockResolvedValue({ id: 'token-1', phone: '79991234567', expiresIn: new Date(Date.now() - 1) })

      await expect(service.checkPhoneCallbackStatus('user-1')).rejects.toThrow(
        'Время ожидания звонка истекло. Запросите новый код.'
      )
      expect(prisma.token.delete).toHaveBeenCalledWith({ where: { id: 'token-1' } })
    })

    it('возвращает confirmed: true и call_id после подтверждения звонком', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        token: 'call-1',
        phone: '79991234567',
        expiresIn: new Date(Date.now() + 60_000)
      })
      zvonokService.checkCallbackConfirmed.mockResolvedValue(true)

      const result = await service.checkPhoneCallbackStatus('user-1')

      expect(result).toEqual({ confirmed: true, code: 'call-1' })
    })
  })

  describe('confirmPhoneChange (подтверждение СМЕНЫ основного номера)', () => {
    it('отклоняет неверный или просроченный код', async () => {
      prisma.token.findFirst.mockResolvedValue(null)

      await expect(service.confirmPhoneChange('user-1', 'call-1')).rejects.toThrow(
        'Неверный код или срок его действия истек'
      )
    })

    it('отклоняет, если номер из токена уже принадлежит ДРУГОМУ аккаунту', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        phone: '79991234567',
        expiresIn: new Date(Date.now() + 60_000)
      })
      prisma.userPhone.findUnique.mockResolvedValue({ id: 'phone-1', userId: 'other-user' })

      await expect(service.confirmPhoneChange('user-1', 'call-1')).rejects.toThrow(
        'Этот номер телефона уже используется другим аккаунтом'
      )
    })

    it('создаёт новый UserPhone как основной, если номера ещё нет в базе', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        phone: '79991234567',
        expiresIn: new Date(Date.now() + 60_000)
      })
      prisma.userPhone.findUnique.mockResolvedValue(null)

      const result = await service.confirmPhoneChange('user-1', 'call-1')

      expect(prisma.userPhone.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isPrimary: true },
        data: { isPrimary: false }
      })
      expect(prisma.userPhone.create).toHaveBeenCalledWith({
        data: { phone: '79991234567', userId: 'user-1', isPrimary: true, isVerified: true }
      })
      expect(prisma.token.delete).toHaveBeenCalledWith({ where: { id: 'token-1' } })
      expect(result).toEqual({ success: true, message: 'Номер телефона успешно изменен' })
    })

    it('делает основным уже существующий (свой) UserPhone, не создавая новый', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        phone: '79991234567',
        expiresIn: new Date(Date.now() + 60_000)
      })
      prisma.userPhone.findUnique.mockResolvedValue({ id: 'phone-1', userId: 'user-1' })

      const result = await service.confirmPhoneChange('user-1', 'call-1')

      expect(prisma.userPhone.update).toHaveBeenCalledWith({
        where: { id: 'phone-1' },
        data: { isPrimary: true, isVerified: true }
      })
      expect(prisma.userPhone.create).not.toHaveBeenCalled()
      expect(result).toEqual({ success: true, message: 'Основной номер изменен' })
    })
  })

  describe('confirmAddPhone (подтверждение ДОБАВЛЕНИЯ дополнительного номера)', () => {
    it('отклоняет неверный или просроченный код', async () => {
      prisma.token.findFirst.mockResolvedValue(null)

      await expect(service.confirmAddPhone('user-1', 'call-1')).rejects.toThrow(
        'Неверный код или срок его действия истек'
      )
    })

    it('отклоняет, если номер уже добавлен на этот же аккаунт', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        phone: '79991234567',
        expiresIn: new Date(Date.now() + 60_000)
      })
      prisma.userPhone.findUnique.mockResolvedValue({ userId: 'user-1' })

      await expect(service.confirmAddPhone('user-1', 'call-1')).rejects.toThrow('Этот номер уже добавлен в ваш аккаунт')
    })

    it('отклоняет, если номер занят другим аккаунтом', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        phone: '79991234567',
        expiresIn: new Date(Date.now() + 60_000)
      })
      prisma.userPhone.findUnique.mockResolvedValue({ userId: 'other-user' })

      await expect(service.confirmAddPhone('user-1', 'call-1')).rejects.toThrow(
        'Этот номер уже используется другим аккаунтом'
      )
    })

    it('первый номер на аккаунте становится основным ДАЖЕ БЕЗ makePrimary', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        phone: '79991234567',
        expiresIn: new Date(Date.now() + 60_000)
      })
      prisma.userPhone.findUnique.mockResolvedValue(null)
      prisma.userPhone.count.mockResolvedValue(0)

      const result = await service.confirmAddPhone('user-1', 'call-1', false)

      expect(prisma.userPhone.create).toHaveBeenCalledWith({
        data: { phone: '79991234567', userId: 'user-1', isPrimary: true, isVerified: true }
      })
      expect(result).toEqual({ success: true, phone: '79991234567' })
    })

    it('второй номер без makePrimary добавляется НЕ основным, старый основной не трогается', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        phone: '79997654321',
        expiresIn: new Date(Date.now() + 60_000)
      })
      prisma.userPhone.findUnique.mockResolvedValue(null)
      prisma.userPhone.count.mockResolvedValue(1)

      await service.confirmAddPhone('user-1', 'call-1', false)

      expect(prisma.userPhone.updateMany).not.toHaveBeenCalled()
      expect(prisma.userPhone.create).toHaveBeenCalledWith({
        data: { phone: '79997654321', userId: 'user-1', isPrimary: false, isVerified: true }
      })
    })

    it('второй номер с makePrimary: true снимает флаг с прежнего основного', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        phone: '79997654321',
        expiresIn: new Date(Date.now() + 60_000)
      })
      prisma.userPhone.findUnique.mockResolvedValue(null)
      prisma.userPhone.count.mockResolvedValue(1)

      await service.confirmAddPhone('user-1', 'call-1', true)

      expect(prisma.userPhone.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isPrimary: true },
        data: { isPrimary: false }
      })
      expect(prisma.userPhone.create).toHaveBeenCalledWith({
        data: { phone: '79997654321', userId: 'user-1', isPrimary: true, isVerified: true }
      })
    })
  })

  describe('setPrimaryPhone (переключение основного без повторного звонка)', () => {
    it('выбрасывает NotFoundException, если номера нет на аккаунте', async () => {
      prisma.userPhone.findFirst.mockResolvedValue(null)

      await expect(service.setPrimaryPhone('user-1', '+79991234567')).rejects.toThrow(
        'Этот номер телефона не найден в вашем аккаунте'
      )
    })

    it('отклоняет неподтверждённый номер', async () => {
      prisma.userPhone.findFirst.mockResolvedValue({ id: 'phone-1', isVerified: false, isPrimary: false })

      await expect(service.setPrimaryPhone('user-1', '+79991234567')).rejects.toThrow(
        'Номер телефона должен быть подтверждён'
      )
    })

    it('не делает лишних записей, если номер уже основной', async () => {
      prisma.userPhone.findFirst.mockResolvedValue({ id: 'phone-1', isVerified: true, isPrimary: true })

      const result = await service.setPrimaryPhone('user-1', '+79991234567')

      expect(prisma.$transaction).not.toHaveBeenCalled()
      expect(result).toEqual({ success: true, message: 'Этот номер уже является основным' })
    })

    it('переключает основной номер на подтверждённый неосновной', async () => {
      prisma.userPhone.findFirst.mockResolvedValue({ id: 'phone-1', isVerified: true, isPrimary: false })

      const result = await service.setPrimaryPhone('user-1', '+79991234567')

      expect(prisma.userPhone.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isPrimary: true },
        data: { isPrimary: false }
      })
      expect(prisma.userPhone.update).toHaveBeenCalledWith({
        where: { id: 'phone-1' },
        data: { isPrimary: true }
      })
      expect(result).toEqual({ success: true, message: 'Основной номер изменён' })
    })
  })

  describe('searchByAdmin', () => {
    beforeEach(() => {
      prisma.user.findMany.mockResolvedValue([])
      prisma.user.count.mockResolvedValue(0)
    })

    it('без запроса отдаёт весь список без фильтра, с дефолтной пагинацией', async () => {
      const result = await service.searchByAdmin({})

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {}, skip: 0, take: 20, orderBy: { createdAt: 'desc' } })
      )
      expect(prisma.user.count).toHaveBeenCalledWith({ where: {} })
      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 20 })
    })

    it('короткий текстовый запрос ищет по имени/email, но не по телефону (< 3 цифр)', async () => {
      await service.searchByAdmin({ query: 'Иван 79' })

      const call = prisma.user.findMany.mock.calls[0][0]
      expect(call.where.OR).toEqual([
        { displayName: { contains: 'Иван 79', mode: 'insensitive' } },
        { email: { contains: 'Иван 79', mode: 'insensitive' } }
      ])
    })

    it('запрос с 3+ цифрами дополнительно ищет по нормализованному телефону', async () => {
      await service.searchByAdmin({ query: '+7 (999) 123-45-67' })

      const call = prisma.user.findMany.mock.calls[0][0]
      expect(call.where.OR).toContainEqual({ phones: { some: { phone: { contains: '79991234567' } } } })
    })

    it('ограничивает limit сотней, даже если запросили больше', async () => {
      await service.searchByAdmin({ page: 2, limit: 500 })

      expect(prisma.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 100, take: 100 }))
    })
  })

  describe('getProfileForClient (см. UserController.findProfile — GET /users/profile)', () => {
    it('не отдаёт хэш пароля и OAuth-токены, но отдаёт hasPassword', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        password: 'argon2-hash',
        premiumUntil: null,
        phones: [{ phone: '79991234567', isPrimary: true }],
        accounts: [
          {
            id: 'account-1',
            provider: 'yandex',
            type: 'oauth',
            createdAt: new Date('2026-01-01'),
            accessToken: 'live-access-token',
            refreshToken: 'live-refresh-token',
            expiresAt: 123
          }
        ]
      })

      const result = await service.getProfileForClient('user-1')

      expect(result).not.toHaveProperty('password')
      expect(result.hasPassword).toBe(true)
      expect(result.accounts).toEqual([
        { id: 'account-1', provider: 'yandex', type: 'oauth', createdAt: new Date('2026-01-01') }
      ])
      expect(result.accounts[0]).not.toHaveProperty('accessToken')
      expect(result.accounts[0]).not.toHaveProperty('refreshToken')
    })

    it('hasPassword=false для OAuth-only аккаунта без пароля', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        password: null,
        premiumUntil: null,
        phones: [],
        accounts: []
      })

      const result = await service.getProfileForClient('user-2')

      expect(result.hasPassword).toBe(false)
    })
  })
})
