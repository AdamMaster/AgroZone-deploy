import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common'
import * as argon2 from 'argon2'

import { AuthService } from './auth.service'
import { PrismaService } from '@/prisma/prisma.service'
import { UserService } from '@/user/user.service'
import { ConfigService } from '@nestjs/config'
import { ProviderService } from './provider/provider.service'
import { EmailConfirmationService } from './email-confirmation/email-confirmation.service'
import { TwoFactorAuthService } from './two-factor-auth/two-factor-auth.service'
import { ZvonokService } from '@/libs/zvonok/zvonok.service'
import { SupportGuestsService } from '@/support/support-guests.service'
import { AuthMethod, TokenType, UserRole } from '@/generated/prisma/enums'

jest.mock('argon2')

const mockedVerify = argon2.verify as jest.MockedFunction<typeof argon2.verify>

describe('AuthService', () => {
  let service: AuthService
  let prisma: any
  let userService: any
  let providerService: any
  let emailConfirmationService: any
  let twoFactorAuthService: any
  let zvonokService: any
  let supportGuestsService: any
  let configService: any

  const createReq = () =>
    ({
      session: {
        save: jest.fn((cb: (err?: unknown) => void) => cb())
      },
      headers: { 'user-agent': 'jest-test-agent' },
      // getClientIp() читает req.ip, а при его отсутствии — req.socket.remoteAddress;
      // в реальном Express-запросе socket всегда есть, в тестовом моке — нет.
      socket: { remoteAddress: '127.0.0.1' }
    }) as any

  const baseUser = (overrides: Record<string, any> = {}) => ({
    id: 'user-1',
    email: null,
    phones: [],
    password: 'hashed-password',
    role: UserRole.USER,
    isVerified: true,
    isTwoFactorEnabled: false,
    ...overrides
  })

  beforeEach(async () => {
    prisma = {
      token: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn()
      },
      account: {
        findUnique: jest.fn(),
        create: jest.fn()
      },
      user: {
        update: jest.fn()
      }
    }

    userService = {
      findByEmail: jest.fn(),
      findByPhone: jest.fn(),
      findById: jest.fn(),
      create: jest.fn()
    }

    providerService = { findByService: jest.fn() }
    emailConfirmationService = { sendVerificationToken: jest.fn().mockResolvedValue(true) }
    twoFactorAuthService = { sendTwoFactorToken: jest.fn().mockResolvedValue(true), validateTwoFactorToken: jest.fn() }
    zvonokService = { requestCallbackConfirmation: jest.fn(), checkCallbackConfirmed: jest.fn() }
    supportGuestsService = { mergeIntoUser: jest.fn().mockResolvedValue(undefined) }
    // ADMIN_EMAILS пуст по умолчанию — ensureAdminRole() внутри saveSession()
    // не должен трогать prisma.user.update ни в одном из "обычных" тестов.
    configService = { get: jest.fn().mockReturnValue(''), getOrThrow: jest.fn() }

    mockedVerify.mockReset()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserService, useValue: userService },
        { provide: ConfigService, useValue: configService },
        { provide: ProviderService, useValue: providerService },
        { provide: EmailConfirmationService, useValue: emailConfirmationService },
        { provide: TwoFactorAuthService, useValue: twoFactorAuthService },
        { provide: ZvonokService, useValue: zvonokService },
        { provide: SupportGuestsService, useValue: supportGuestsService }
      ]
    }).compile()

    service = module.get(AuthService)
  })

  // ---------------------------------------------------------------------
  // Регистрация по телефону (звонок для подтверждения) — единственный
  // реально используемый способ регистрации на сайте.
  // ---------------------------------------------------------------------
  describe('registerSmsStart', () => {
    it('отклоняет регистрацию, если номер уже занят', async () => {
      userService.findByPhone.mockResolvedValue(baseUser())

      await expect(service.registerSmsStart({ phone: '+7 (999) 123-45-67' } as any)).rejects.toThrow(
        ConflictException
      )
      await expect(service.registerSmsStart({ phone: '+7 (999) 123-45-67' } as any)).rejects.toThrow(
        'Пользователь с таким номером телефона уже зарегистрирован.'
      )
    })

    it('запрашивает звонок для подтверждения, если номер свободен', async () => {
      userService.findByPhone.mockResolvedValue(null)
      zvonokService.requestCallbackConfirmation.mockResolvedValue({ callId: 'call-123', number: '+7 930 555-86-07' })

      const result = await service.registerSmsStart({ phone: '+7 (999) 123-45-67' } as any)

      expect(zvonokService.requestCallbackConfirmation).toHaveBeenCalledWith('79991234567')
      expect(prisma.token.deleteMany).toHaveBeenCalledWith({
        where: { phone: '79991234567', type: TokenType.SMS_VERIFICATION }
      })
      expect(prisma.token.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ phone: '79991234567', token: 'call-123', type: TokenType.SMS_VERIFICATION })
        })
      )
      expect(result).toEqual({
        message: 'Позвоните с этого номера на +7 930 555-86-07 — подтверждение придёт автоматически',
        callNumber: '+7 930 555-86-07'
      })
    })

    it('отклоняет некорректный номер телефона (валидация normalizePhone)', async () => {
      userService.findByPhone.mockResolvedValue(null)

      await expect(service.registerSmsStart({ phone: '123' } as any)).rejects.toThrow(BadRequestException)
    })
  })

  describe('registerSmsComplete', () => {
    const dto = {
      phone: '+7 (999) 123-45-67',
      code: 'call-123',
      name: 'Иван',
      password: 'password123',
      passwordRepeat: 'password123',
      personalDataConsent: true
    } as any

    it('отклоняет неверный код подтверждения (звонок ещё не поступил / чужой call_id)', async () => {
      prisma.token.findFirst.mockResolvedValue(null)

      await expect(service.registerSmsComplete(createReq(), dto)).rejects.toThrow('Неверный код подтверждения')
    })

    it('отклоняет и удаляет токен, если время ожидания звонка истекло', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        expiresIn: new Date(Date.now() - 1000)
      })

      await expect(service.registerSmsComplete(createReq(), dto)).rejects.toThrow(
        'Срок действия кода истек. Запросите новый.'
      )
      expect(prisma.token.delete).toHaveBeenCalledWith({ where: { id: 'token-1' } })
    })

    it('создаёт аккаунт и открывает сессию после успешного звонка', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        expiresIn: new Date(Date.now() + 60_000)
      })
      const createdUser = baseUser({ id: 'new-user', phones: [{ phone: '79991234567' }] })
      userService.create.mockResolvedValue(createdUser)

      const req = createReq()
      await service.registerSmsComplete(req, dto)

      expect(userService.create).toHaveBeenCalledWith(
        null,
        'password123',
        'Иван',
        '79991234567',
        '',
        AuthMethod.CREDENTIALS,
        true,
        true,
        expect.objectContaining({ userAgent: 'jest-test-agent' })
      )
      expect(prisma.token.delete).toHaveBeenCalledWith({ where: { id: 'token-1' } })
      expect(req.session.userId).toBe('new-user')
    })
  })

  describe('checkSmsCallbackStatus (опрос "позвонили или нет")', () => {
    it('сообщает, что код не запрошен, если токена ещё нет', async () => {
      prisma.token.findFirst.mockResolvedValue(null)

      await expect(service.checkSmsCallbackStatus('+7 (999) 123-45-67')).rejects.toThrow(
        'Код подтверждения не запрошен. Запросите новый.'
      )
    })

    it('удаляет токен и сообщает об истечении времени ожидания звонка', async () => {
      prisma.token.findFirst.mockResolvedValue({ id: 'token-1', token: 'call-123', expiresIn: new Date(Date.now() - 1) })

      await expect(service.checkSmsCallbackStatus('+7 (999) 123-45-67')).rejects.toThrow(
        'Время ожидания звонка истекло. Запросите новый код.'
      )
      expect(prisma.token.delete).toHaveBeenCalledWith({ where: { id: 'token-1' } })
    })

    it('возвращает confirmed: false, пока звонок не подтверждён (в т.ч. если звонили не с того номера)', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        token: 'call-123',
        expiresIn: new Date(Date.now() + 60_000)
      })
      zvonokService.checkCallbackConfirmed.mockResolvedValue(false)

      const result = await service.checkSmsCallbackStatus('+7 (999) 123-45-67')

      expect(result).toEqual({ confirmed: false })
    })

    it('возвращает confirmed: true и call_id, когда звонок подтверждён', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        token: 'call-123',
        expiresIn: new Date(Date.now() + 60_000)
      })
      zvonokService.checkCallbackConfirmed.mockResolvedValue(true)

      const result = await service.checkSmsCallbackStatus('+7 (999) 123-45-67')

      expect(result).toEqual({ confirmed: true, code: 'call-123' })
    })
  })

  // ---------------------------------------------------------------------
  // Логин: по почте и по телефону, включая блокировку неподтверждённой
  // почты и двухфакторную аутентификацию.
  // ---------------------------------------------------------------------
  describe('login', () => {
    it('определяет email по наличию "@" и ищет пользователя по почте', async () => {
      const user = baseUser({ email: 'test@example.com' })
      userService.findByEmail.mockResolvedValue(user)
      mockedVerify.mockResolvedValue(true)

      await service.login(createReq(), { login: 'test@example.com', password: 'secret1' } as any)

      expect(userService.findByEmail).toHaveBeenCalledWith('test@example.com')
      expect(userService.findByPhone).not.toHaveBeenCalled()
    })

    it('если "@" нет — нормализует и ищет пользователя по телефону', async () => {
      const user = baseUser()
      userService.findByPhone.mockResolvedValue(user)
      mockedVerify.mockResolvedValue(true)

      await service.login(createReq(), { login: '+7 (999) 123-45-67', password: 'secret1' } as any)

      expect(userService.findByPhone).toHaveBeenCalledWith('79991234567')
      expect(userService.findByEmail).not.toHaveBeenCalled()
    })

    it('выбрасывает NotFoundException, если пользователь не найден', async () => {
      userService.findByPhone.mockResolvedValue(null)

      await expect(
        service.login(createReq(), { login: '+79991234567', password: 'secret1' } as any)
      ).rejects.toThrow('Пользователь не найден. Пожалуйста, проверьте введенные данные.')
    })

    it('выбрасывает NotFoundException, если у аккаунта вообще нет пароля (например, только OAuth)', async () => {
      userService.findByPhone.mockResolvedValue(baseUser({ password: null }))

      await expect(
        service.login(createReq(), { login: '+79991234567', password: 'secret1' } as any)
      ).rejects.toThrow(NotFoundException)
    })

    it('выбрасывает UnauthorizedException при неверном пароле', async () => {
      userService.findByPhone.mockResolvedValue(baseUser())
      mockedVerify.mockResolvedValue(false)

      await expect(
        service.login(createReq(), { login: '+79991234567', password: 'wrong' } as any)
      ).rejects.toThrow('Неверный пароль. Пожалуйста, попробуйте еще раз, или восстановите пароль, если забыли его.')
    })

    it('блокирует вход и повторно отправляет письмо, если email не подтверждён', async () => {
      const user = baseUser({ email: 'test@example.com', isVerified: false })
      userService.findByEmail.mockResolvedValue(user)
      mockedVerify.mockResolvedValue(true)

      await expect(
        service.login(createReq(), { login: 'test@example.com', password: 'secret1' } as any)
      ).rejects.toThrow('Ваш email не подтвержден. Пожалуйста, проверьте вашу почту и подтвердите адрес.')

      expect(emailConfirmationService.sendVerificationToken).toHaveBeenCalledWith('test@example.com')
    })

    it('для аккаунта без email блокировка "не подтверждён" не срабатывает, даже если isVerified: false', async () => {
      // Задокументированный крайний случай: проверка `!user.isVerified && user.email`
      // требует ОБА условия — телефонный аккаунт с isVerified: false её не пройдёт.
      const user = baseUser({ email: null, isVerified: false })
      userService.findByPhone.mockResolvedValue(user)
      mockedVerify.mockResolvedValue(true)

      const req = createReq()
      await service.login(req, { login: '+79991234567', password: 'secret1' } as any)

      expect(emailConfirmationService.sendVerificationToken).not.toHaveBeenCalled()
      expect(req.session.userId).toBe(user.id)
    })

    it('без 2FA сразу открывает сессию', async () => {
      const user = baseUser({ email: 'test@example.com' })
      userService.findByEmail.mockResolvedValue(user)
      mockedVerify.mockResolvedValue(true)

      const req = createReq()
      const result: any = await service.login(req, { login: 'test@example.com', password: 'secret1' } as any)

      expect(req.session.userId).toBe(user.id)
      expect(result.user).toBeDefined()
    })

    it('с включённой 2FA и без кода — отправляет код на почту и не открывает сессию', async () => {
      const user = baseUser({ email: 'test@example.com', isTwoFactorEnabled: true })
      userService.findByEmail.mockResolvedValue(user)
      mockedVerify.mockResolvedValue(true)

      const req = createReq()
      const result = await service.login(req, { login: 'test@example.com', password: 'secret1' } as any)

      expect(twoFactorAuthService.sendTwoFactorToken).toHaveBeenCalledWith('test@example.com')
      expect(twoFactorAuthService.validateTwoFactorToken).not.toHaveBeenCalled()
      expect(result).toEqual({ message: 'Проверьте вашу почту. Требуется код двухфакторной аутентификации.' })
      expect(req.session.userId).toBeUndefined()
    })

    it('с включённой 2FA и верным кодом — проверяет код и открывает сессию', async () => {
      const user = baseUser({ email: 'test@example.com', isTwoFactorEnabled: true })
      userService.findByEmail.mockResolvedValue(user)
      mockedVerify.mockResolvedValue(true)
      twoFactorAuthService.validateTwoFactorToken.mockResolvedValue(true)

      const req = createReq()
      await service.login(req, { login: 'test@example.com', password: 'secret1', code: '123456' } as any)

      expect(twoFactorAuthService.validateTwoFactorToken).toHaveBeenCalledWith('test@example.com', '123456')
      expect(req.session.userId).toBe(user.id)
    })

    it('с включённой 2FA и неверным кодом — не открывает сессию, ошибка пробрасывается наружу', async () => {
      const user = baseUser({ email: 'test@example.com', isTwoFactorEnabled: true })
      userService.findByEmail.mockResolvedValue(user)
      mockedVerify.mockResolvedValue(true)
      twoFactorAuthService.validateTwoFactorToken.mockRejectedValue(
        new BadRequestException('Неверный код двухфакторной аутентификации.')
      )

      const req = createReq()
      await expect(
        service.login(req, { login: 'test@example.com', password: 'secret1', code: 'wrong' } as any)
      ).rejects.toThrow(BadRequestException)
      expect(req.session.userId).toBeUndefined()
    })

    it('телефонный аккаунт с 2FA, но без email — 2FA-ветка полностью пропускается', async () => {
      // `isTwoFactorEnabled && user.email` — у чисто телефонного аккаунта
      // email нет, значит переключатель 2FA (если он вообще был бы включён)
      // не имеет эффекта на вход по телефону.
      const user = baseUser({ email: null, isTwoFactorEnabled: true })
      userService.findByPhone.mockResolvedValue(user)
      mockedVerify.mockResolvedValue(true)

      const req = createReq()
      await service.login(req, { login: '+79991234567', password: 'secret1' } as any)

      expect(twoFactorAuthService.sendTwoFactorToken).not.toHaveBeenCalled()
      expect(req.session.userId).toBe(user.id)
    })

    it('повышает роль до ADMIN, если email пользователя указан в ADMIN_EMAILS', async () => {
      const user = baseUser({ email: 'boss@example.com', role: UserRole.USER })
      userService.findByEmail.mockResolvedValue(user)
      mockedVerify.mockResolvedValue(true)
      configService.get.mockImplementation((key: string) => (key === 'ADMIN_EMAILS' ? 'boss@example.com' : ''))
      prisma.user.update.mockResolvedValue({ ...user, role: UserRole.ADMIN })

      const req = createReq()
      await service.login(req, { login: 'boss@example.com', password: 'secret1' } as any)

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: user.id },
        data: { role: UserRole.ADMIN }
      })
      expect(req.session.userRole).toBe(UserRole.ADMIN)
    })
  })

  // ---------------------------------------------------------------------
  // Быстрая регистрация/вход через Яндекс (OAuth) — второй реально
  // используемый способ. Самое важное: привязка к уже существующему
  // аккаунту (например, телефонному, к которому позже добавили email)
  // по совпадению email, а не создание дубликата.
  // ---------------------------------------------------------------------
  describe('extractProfileFromCode (OAuth-колбэк, напр. Яндекс)', () => {
    const profile = {
      id: 'yandex-oauth-id-1',
      provider: 'yandex',
      email: 'shared@example.com',
      name: 'Иван Иванов',
      picture: '',
      access_token: 'at',
      refresh_token: 'rt',
      expires_at: 3600
    }

    const setupProvider = () => {
      providerService.findByService.mockReturnValue({
        findUserByCode: jest.fn().mockResolvedValue(profile)
      })
    }

    it('создаёт нового пользователя, если ни привязанного Account, ни пользователя с таким email нет', async () => {
      setupProvider()
      prisma.account.findUnique.mockResolvedValue(null)
      userService.findByEmail.mockResolvedValue(null)
      const newUser = baseUser({ id: 'brand-new-user', email: profile.email })
      userService.create.mockResolvedValue(newUser)

      const req = createReq()
      const result = await service.extractProfileFromCode(req, 'yandex', 'auth-code')

      expect(userService.create).toHaveBeenCalled()
      expect(prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 'brand-new-user', provider: 'yandex', providerAccountId: 'yandex-oauth-id-1' })
        })
      )
      expect(result).toEqual({ isNewUser: true })
      expect(req.session.userId).toBe('brand-new-user')
    })

    it('находит пользователя по уже привязанному Account (обычный повторный вход через Яндекс)', async () => {
      setupProvider()
      prisma.account.findUnique.mockResolvedValue({ userId: 'existing-user' })
      const existingUser = baseUser({ id: 'existing-user', email: profile.email })
      userService.findById.mockResolvedValue(existingUser)

      const req = createReq()
      const result = await service.extractProfileFromCode(req, 'yandex', 'auth-code')

      expect(userService.findByEmail).not.toHaveBeenCalled()
      expect(prisma.account.create).not.toHaveBeenCalled() // Account уже существует
      expect(result).toEqual({ isNewUser: false })
      expect(req.session.userId).toBe('existing-user')
    })

    it('ПРИОРИТЕТНЫЙ СЦЕНАРИЙ: привязывает Яндекс-вход к уже существующему аккаунту (например, зарегистрированному по телефону) по совпадению email, не создавая дубликат', async () => {
      setupProvider()
      // Account с таким providerAccountId ещё не создавался — это первый
      // вход через Яндекс для этого человека.
      prisma.account.findUnique.mockResolvedValue(null)
      // Но пользователь с таким email уже есть — например, зарегистрировался
      // по телефону, а затем добавил этот email через смену почты в настройках.
      const existingPhoneUser = baseUser({
        id: 'phone-registered-user',
        email: profile.email,
        phones: [{ phone: '79991234567' }]
      })
      userService.findByEmail.mockResolvedValue(existingPhoneUser)

      const req = createReq()
      const result = await service.extractProfileFromCode(req, 'yandex', 'auth-code')

      // Ключевая проверка: НЕ создаём нового пользователя.
      expect(userService.create).not.toHaveBeenCalled()
      // Создаём для него новую Account-запись, привязывающую Яндекс к
      // существующему id.
      expect(prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'phone-registered-user',
            provider: 'yandex',
            providerAccountId: 'yandex-oauth-id-1'
          })
        })
      )
      expect(result).toEqual({ isNewUser: false })
      // Сессия открыта именно для существующего (телефонного) аккаунта.
      expect(req.session.userId).toBe('phone-registered-user')
    })
  })
})
