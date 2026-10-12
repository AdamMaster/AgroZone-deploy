import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as argon2 from 'argon2'

import { PasswordRecoveryService } from './password-recovery.service'
import { PrismaService } from '@/prisma/prisma.service'
import { UserService } from '@/user/user.service'
import { MailService } from '@/libs/mail/mail.service'
import { SecurityEventsService } from '@/security-events/security-events.service'
import { RateLimitService } from '@/libs/rate-limit/rate-limit.service'
import { AuthService } from '@/auth/auth.service'
import { ThrottlerException } from '@nestjs/throttler'
import { SecurityEventType, TokenType } from '@/generated/prisma/enums'

jest.mock('argon2')

const mockedHash = argon2.hash as jest.MockedFunction<typeof argon2.hash>

describe('PasswordRecoveryService', () => {
  let service: PasswordRecoveryService
  let prisma: any
  let userService: any
  let mailService: any
  let securityEventsService: any
  let rateLimitService: any
  let authService: any

  const validToken = (overrides: Record<string, unknown> = {}) => ({
    id: 'token-1',
    token: 'reset-token',
    email: 'user@example.com',
    type: TokenType.PASSWORD_RESET,
    expiresIn: new Date(Date.now() + 3600_000),
    ...overrides
  })

  beforeEach(async () => {
    prisma = {
      token: {
        findFirst: jest.fn(),
        create: jest.fn(),
        delete: jest.fn()
      },
      user: {
        update: jest.fn()
      }
    }
    userService = { findByEmail: jest.fn(), findByPhone: jest.fn() }
    mailService = { sendPasswordResetEmail: jest.fn().mockResolvedValue(true) }
    securityEventsService = { record: jest.fn().mockResolvedValue(undefined) }
    rateLimitService = { hit: jest.fn().mockResolvedValue({ allowed: true, count: 1 }) }
    authService = {
      sendSmsCode: jest.fn().mockResolvedValue({ message: 'Позвоните', callNumber: '+7 (800) 555-35-35' }),
      checkSmsCallbackStatus: jest.fn(),
      assertCallConfirmed: jest.fn().mockResolvedValue(undefined)
    }

    mockedHash.mockReset()
    mockedHash.mockResolvedValue('hashed-new-password' as any)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordRecoveryService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserService, useValue: userService },
        { provide: MailService, useValue: mailService },
        { provide: SecurityEventsService, useValue: securityEventsService },
        { provide: RateLimitService, useValue: rateLimitService },
        { provide: AuthService, useValue: authService }
      ]
    }).compile()

    service = module.get(PasswordRecoveryService)
  })

  describe('resetPassword', () => {
    const user = { id: 'user-1', email: 'user@example.com' }

    beforeEach(() => {
      prisma.token.findFirst.mockResolvedValue(null)
      prisma.token.create.mockResolvedValue({ email: user.email, token: 'new-token' })
    })

    it('для существующего адреса отправляет письмо и возвращает true', async () => {
      userService.findByEmail.mockResolvedValue(user)

      await expect(service.resetPassword({ email: user.email })).resolves.toBe(true)
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(user.email, 'new-token')
    })

    it('для несуществующего адреса отвечает так же (true) и письмо не шлёт', async () => {
      userService.findByEmail.mockResolvedValue(null)

      await expect(service.resetPassword({ email: 'nobody@example.com' })).resolves.toBe(true)
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('при превышении лимита на адрес отвечает true, но ничего не делает', async () => {
      rateLimitService.hit.mockResolvedValue({ allowed: false, count: 4 })

      await expect(service.resetPassword({ email: user.email })).resolves.toBe(true)
      expect(userService.findByEmail).not.toHaveBeenCalled()
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('ключ лимита не зависит от регистра и пробелов в адресе', async () => {
      userService.findByEmail.mockResolvedValue(null)

      await service.resetPassword({ email: '  User@Example.com ' })
      expect(rateLimitService.hit).toHaveBeenCalledWith('password-reset:user@example.com', 3, 3600)
    })
  })

  describe('newPassword', () => {
    it('выбрасывает NotFoundException для несуществующего токена и ничего не пишет в журнал', async () => {
      prisma.token.findFirst.mockResolvedValue(null)

      await expect(service.newPassword({ password: 'newpass1' } as any, 'bad-token')).rejects.toThrow(NotFoundException)

      expect(prisma.user.update).not.toHaveBeenCalled()
      expect(securityEventsService.record).not.toHaveBeenCalled()
    })

    it('отклоняет просроченный токен и не пишет в журнал', async () => {
      prisma.token.findFirst.mockResolvedValue(validToken({ expiresIn: new Date(Date.now() - 1000) }))

      await expect(service.newPassword({ password: 'newpass1' } as any, 'reset-token')).rejects.toThrow(
        BadRequestException
      )

      expect(securityEventsService.record).not.toHaveBeenCalled()
    })

    it('не пишет в журнал, если пользователь по email из токена не найден', async () => {
      prisma.token.findFirst.mockResolvedValue(validToken())
      userService.findByEmail.mockResolvedValue(null)

      await expect(service.newPassword({ password: 'newpass1' } as any, 'reset-token')).rejects.toThrow(
        NotFoundException
      )

      expect(securityEventsService.record).not.toHaveBeenCalled()
    })

    it('при валидном токене меняет пароль, гасит токен и пишет PASSWORD_RESET', async () => {
      prisma.token.findFirst.mockResolvedValue(validToken())
      userService.findByEmail.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })

      const result = await service.newPassword({ password: 'newpass1' } as any, 'reset-token')

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'hashed-new-password' }
      })
      expect(prisma.token.delete).toHaveBeenCalledWith({
        where: { id: 'token-1', type: TokenType.PASSWORD_RESET }
      })
      expect(securityEventsService.record).toHaveBeenCalledWith({
        userId: 'user-1',
        type: SecurityEventType.PASSWORD_RESET
      })
      expect(result).toBe(true)
    })

    it('в журнал не попадает ни новый пароль, ни токен сброса', async () => {
      prisma.token.findFirst.mockResolvedValue(validToken())
      userService.findByEmail.mockResolvedValue({ id: 'user-1', email: 'user@example.com' })

      await service.newPassword({ password: 'newpass1-secret' } as any, 'reset-token')

      const logged = JSON.stringify(securityEventsService.record.mock.calls)
      expect(logged).not.toContain('newpass1-secret')
      expect(logged).not.toContain('reset-token')
    })
  })

  describe('phoneResetStart', () => {
    it('для существующего номера просит звонок и передаёт IP пользователя', async () => {
      userService.findByPhone.mockResolvedValue({ id: 'user-1' })

      const result = await service.phoneResetStart({ phone: '+7 (999) 123-45-67' }, '203.0.113.5')

      expect(userService.findByPhone).toHaveBeenCalledWith('79991234567')
      expect(authService.sendSmsCode).toHaveBeenCalledWith('79991234567', TokenType.PASSWORD_RESET, '203.0.113.5')
      expect(result).toEqual({ message: 'Позвоните', callNumber: '+7 (800) 555-35-35' })
    })

    it('для неизвестного номера отвечает NotFoundException и звонок не заказывает', async () => {
      userService.findByPhone.mockResolvedValue(null)

      await expect(service.phoneResetStart({ phone: '79991234567' })).rejects.toBeInstanceOf(NotFoundException)
      expect(authService.sendSmsCode).not.toHaveBeenCalled()
    })

    it('при превышении лимита на номер отклоняет запрос, не трогая пользователя и провайдера', async () => {
      rateLimitService.hit.mockResolvedValue({ allowed: false, count: 6 })

      await expect(service.phoneResetStart({ phone: '79991234567' })).rejects.toBeInstanceOf(ThrottlerException)
      expect(userService.findByPhone).not.toHaveBeenCalled()
      expect(authService.sendSmsCode).not.toHaveBeenCalled()
    })

    it('ключ лимита строится по нормализованному номеру', async () => {
      userService.findByPhone.mockResolvedValue({ id: 'user-1' })

      await service.phoneResetStart({ phone: '8 999 123-45-67' })

      expect(rateLimitService.hit).toHaveBeenCalledWith('password-reset-phone:79991234567', 5, 3600)
    })
  })

  describe('phoneResetStatus', () => {
    it('опрашивает статус звонка с типом PASSWORD_RESET', async () => {
      authService.checkSmsCallbackStatus.mockResolvedValue({ confirmed: true, code: 'sr:1' })

      await expect(service.phoneResetStatus({ phone: '79991234567' })).resolves.toEqual({
        confirmed: true,
        code: 'sr:1'
      })
      expect(authService.checkSmsCallbackStatus).toHaveBeenCalledWith('79991234567', TokenType.PASSWORD_RESET)
    })
  })

  describe('newPasswordByPhone', () => {
    const dto = { phone: '+7 (999) 123-45-67', code: 'sr:1', password: 'newpass1' }
    const phoneToken = (overrides: Record<string, unknown> = {}) => ({
      id: 'token-1',
      token: 'sr:1',
      phone: '79991234567',
      email: null,
      type: TokenType.PASSWORD_RESET,
      expiresIn: new Date(Date.now() + 300_000),
      ...overrides
    })

    it('ищет токен по номеру, коду и типу PASSWORD_RESET', async () => {
      prisma.token.findFirst.mockResolvedValue(null)

      await expect(service.newPasswordByPhone(dto)).rejects.toBeInstanceOf(BadRequestException)
      expect(prisma.token.findFirst).toHaveBeenCalledWith({
        where: { phone: '79991234567', token: 'sr:1', type: TokenType.PASSWORD_RESET }
      })
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('просроченный токен удаляет и отклоняет', async () => {
      prisma.token.findFirst.mockResolvedValue(phoneToken({ expiresIn: new Date(Date.now() - 1000) }))

      await expect(service.newPasswordByPhone(dto)).rejects.toBeInstanceOf(BadRequestException)
      expect(prisma.token.delete).toHaveBeenCalledWith({ where: { id: 'token-1' } })
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('если звонок не подтверждён провайдером, пароль не меняет', async () => {
      prisma.token.findFirst.mockResolvedValue(phoneToken())
      authService.assertCallConfirmed.mockRejectedValue(new BadRequestException('Звонок не получен.'))

      await expect(service.newPasswordByPhone(dto)).rejects.toBeInstanceOf(BadRequestException)
      expect(authService.assertCallConfirmed).toHaveBeenCalledWith('79991234567', 'sr:1')
      expect(prisma.user.update).not.toHaveBeenCalled()
      expect(prisma.token.delete).not.toHaveBeenCalled()
    })

    it('не меняет пароль, если аккаунт с этим номером пропал', async () => {
      prisma.token.findFirst.mockResolvedValue(phoneToken())
      userService.findByPhone.mockResolvedValue(null)

      await expect(service.newPasswordByPhone(dto)).rejects.toBeInstanceOf(NotFoundException)
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('при подтверждённом звонке меняет пароль, гасит токен и пишет PASSWORD_RESET', async () => {
      prisma.token.findFirst.mockResolvedValue(phoneToken())
      userService.findByPhone.mockResolvedValue({ id: 'user-1' })

      await expect(service.newPasswordByPhone(dto)).resolves.toBe(true)

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'hashed-new-password' }
      })
      expect(prisma.token.delete).toHaveBeenCalledWith({
        where: { id: 'token-1', type: TokenType.PASSWORD_RESET }
      })
      expect(securityEventsService.record).toHaveBeenCalledWith({
        userId: 'user-1',
        type: SecurityEventType.PASSWORD_RESET
      })
    })

    it('токен из письма (с email, без номера) этим путём не принимается', async () => {
      prisma.token.findFirst.mockResolvedValue(null)

      await expect(service.newPasswordByPhone({ ...dto, code: 'reset-token' })).rejects.toBeInstanceOf(
        BadRequestException
      )
    })
  })
})
