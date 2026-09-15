import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import * as argon2 from 'argon2'

import { EmailChangeService } from './email-change.service'
import { PrismaService } from '@/prisma/prisma.service'
import { UserService } from '@/user/user.service'
import { MailService } from '@/libs/mail/mail.service'
import { TokenType } from '@/generated/prisma/enums'

jest.mock('argon2')

const mockedVerify = argon2.verify as jest.MockedFunction<typeof argon2.verify>

describe('EmailChangeService', () => {
  let service: EmailChangeService
  let prisma: any
  let userService: any
  let mailService: any

  beforeEach(async () => {
    prisma = {
      token: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        delete: jest.fn()
      },
      user: {
        update: jest.fn()
      }
    }

    userService = {
      findById: jest.fn(),
      findByEmail: jest.fn()
    }

    mailService = { sendEmailChange: jest.fn().mockResolvedValue(true) }

    mockedVerify.mockReset()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailChangeService,
        { provide: PrismaService, useValue: prisma },
        { provide: UserService, useValue: userService },
        { provide: MailService, useValue: mailService }
      ]
    }).compile()

    service = module.get(EmailChangeService)
  })

  describe('requestEmailChange', () => {
    const dto = { newEmail: 'new@example.com', password: 'current-pass' }

    it('выбрасывает NotFoundException, если пользователь не найден', async () => {
      userService.findById.mockResolvedValue(null)

      await expect(service.requestEmailChange('user-1', dto)).rejects.toThrow(NotFoundException)
    })

    it('отклоняет запрос, если у аккаунта вообще нет пароля (OAuth-only аккаунт)', async () => {
      userService.findById.mockResolvedValue({ id: 'user-1', password: null })

      await expect(service.requestEmailChange('user-1', dto)).rejects.toThrow(
        'Для этого аккаунта пароль не установлен. Попробуйте войти через соцсети.'
      )
    })

    it('отклоняет запрос при неверном текущем пароле', async () => {
      userService.findById.mockResolvedValue({ id: 'user-1', password: 'hashed' })
      mockedVerify.mockResolvedValue(false)

      await expect(service.requestEmailChange('user-1', dto)).rejects.toThrow('Неверный текущий пароль')
    })

    it('отклоняет запрос, если новый email уже занят другим аккаунтом', async () => {
      userService.findById.mockResolvedValue({ id: 'user-1', password: 'hashed' })
      mockedVerify.mockResolvedValue(true)
      userService.findByEmail.mockResolvedValue({ id: 'other-user' })

      await expect(service.requestEmailChange('user-1', dto)).rejects.toThrow(
        'Этот адрес электронной почты уже используется'
      )
    })

    it('при верных данных удаляет старые токены, создаёт новый и отправляет письмо на НОВЫЙ адрес', async () => {
      userService.findById.mockResolvedValue({ id: 'user-1', password: 'hashed' })
      mockedVerify.mockResolvedValue(true)
      userService.findByEmail.mockResolvedValue(null)

      const result = await service.requestEmailChange('user-1', dto)

      expect(prisma.token.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: TokenType.EMAIL_CHANGE }
      })
      expect(prisma.token.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ email: 'new@example.com', userId: 'user-1', type: TokenType.EMAIL_CHANGE })
        })
      )
      expect(mailService.sendEmailChange).toHaveBeenCalledWith('new@example.com', expect.any(String))
      expect(result).toBe(true)
    })
  })

  describe('confirmEmailChange', () => {
    it('выбрасывает NotFoundException для несуществующей или чужой ссылки', async () => {
      prisma.token.findFirst.mockResolvedValue(null)

      await expect(service.confirmEmailChange('bad-token')).rejects.toThrow('Ссылка устарела или недействительна')
    })

    it('выбрасывает BadRequestException для просроченной ссылки (не подтверждает email)', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        email: 'new@example.com',
        expiresIn: new Date(Date.now() - 1000)
      })

      await expect(service.confirmEmailChange('expired-token')).rejects.toThrow('Срок действия ссылки истек')
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('при валидной ссылке меняет email, помечает isVerified и удаляет токен', async () => {
      prisma.token.findFirst.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        email: 'new@example.com',
        expiresIn: new Date(Date.now() + 3600_000)
      })

      const result = await service.confirmEmailChange('valid-token')

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { email: 'new@example.com', isVerified: true }
      })
      expect(prisma.token.delete).toHaveBeenCalledWith({ where: { id: 'token-1' } })
      expect(result).toBe(true)
    })
  })
})
