import { BadRequestException, NotFoundException } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as argon2 from 'argon2'

import { PasswordRecoveryService } from './password-recovery.service'
import { PrismaService } from '@/prisma/prisma.service'
import { UserService } from '@/user/user.service'
import { MailService } from '@/libs/mail/mail.service'
import { SecurityEventsService } from '@/security-events/security-events.service'
import { SecurityEventType, TokenType } from '@/generated/prisma/enums'

jest.mock('argon2')

const mockedHash = argon2.hash as jest.MockedFunction<typeof argon2.hash>

describe('PasswordRecoveryService', () => {
  let service: PasswordRecoveryService
  let prisma: any
  let userService: any
  let mailService: any
  let securityEventsService: any

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
    userService = { findByEmail: jest.fn() }
    mailService = { sendPasswordResetEmail: jest.fn().mockResolvedValue(true) }
    securityEventsService = { record: jest.fn().mockResolvedValue(undefined) }

    mockedHash.mockReset()
    mockedHash.mockResolvedValue('hashed-new-password' as any)

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordRecoveryService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserService, useValue: userService },
        { provide: MailService, useValue: mailService },
        { provide: SecurityEventsService, useValue: securityEventsService }
      ]
    }).compile()

    service = module.get(PasswordRecoveryService)
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
})
