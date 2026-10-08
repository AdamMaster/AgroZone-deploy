import { hash } from 'argon2'
import { MailService } from '@/libs/mail/mail.service'
import { PrismaService } from '@/prisma/prisma.service'
import { UserService } from '@/user/user.service'
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common'
import { v4 as uuidv4 } from 'uuid'
import { SecurityEventType, TokenType } from '@/generated/prisma/enums'
import { SecurityEventsService } from '@/security-events/security-events.service'
import { RateLimitService } from '@/libs/rate-limit/rate-limit.service'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { NewPasswordDto } from './dto/new-password.dto'

const RESET_EMAIL_LIMIT = 3
const RESET_EMAIL_WINDOW_SECONDS = 60 * 60

@Injectable()
export class PasswordRecoveryService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly mailService: MailService,
    private readonly securityEventsService: SecurityEventsService,
    private readonly rateLimitService: RateLimitService
  ) {}

  // Ответ всегда одинаковый (true), существует такой адрес или нет: иначе
  // форма сброса пароля работала бы как проверка «зарегистрирован ли этот
  // email на сайте». Лимит — не больше RESET_EMAIL_LIMIT писем на один
  // адрес за RESET_EMAIL_WINDOW_SECONDS: ротацией IP его не обойти, а
  // почтовый ящик жертвы не заспамят письмами со ссылкой.
  async resetPassword(dto: ResetPasswordDto) {
    // Регистр только для ключа лимита: поиск пользователя — по адресу как есть (как при входе).
    const limit = await this.rateLimitService.hit(
      `password-reset:${dto.email.trim().toLowerCase()}`,
      RESET_EMAIL_LIMIT,
      RESET_EMAIL_WINDOW_SECONDS
    )

    if (!limit.allowed) {
      return true
    }

    const existingUser = await this.userService.findByEmail(dto.email)

    if (!existingUser?.email) {
      return true
    }

    const passwordResetToken = await this.generatePasswordResetToken(existingUser.email)

    if (!passwordResetToken.email) {
      throw new InternalServerErrorException('Ошибка при формировании данных для письма')
    }

    await this.mailService.sendPasswordResetEmail(passwordResetToken.email, passwordResetToken.token)

    return true
  }

  async newPassword(dto: NewPasswordDto, token: string) {
    const existingToken = await this.prismaService.token.findFirst({
      where: {
        token,
        type: TokenType.PASSWORD_RESET
      }
    })

    if (!existingToken) {
      throw new NotFoundException(
        'Токен не найден. Пожалуйста, проверьте правильность введенного токена, или запросите новый.'
      )
    }

    const hasExpired = new Date(existingToken.expiresIn) < new Date()

    if (hasExpired) {
      throw new BadRequestException('Токен истек. Пожалуйста, запросите новый токен для подтверждения сброса пароля.')
    }

    if (!existingToken.email) {
      throw new BadRequestException('Токен не связан с адресом электронной почты.')
    }

    const existingUser = await this.userService.findByEmail(existingToken.email)

    if (!existingUser) {
      throw new NotFoundException(
        'Пользователь не найден. Пожалуйста, проверьте введенный адрес электронной почты и попробуйте снова.'
      )
    }

    await this.prismaService.user.update({
      where: {
        id: existingUser.id
      },
      data: {
        password: await hash(dto.password)
      }
    })

    await this.prismaService.token.delete({
      where: {
        id: existingToken.id,
        type: TokenType.PASSWORD_RESET
      }
    })

    await this.securityEventsService.record({ userId: existingUser.id, type: SecurityEventType.PASSWORD_RESET })

    return true
  }

  private async generatePasswordResetToken(email: string) {
    const token = uuidv4()
    const expiresIn = new Date(new Date().getTime() + 3600 * 1000)

    const existingToken = await this.prismaService.token.findFirst({
      where: {
        email,
        type: TokenType.PASSWORD_RESET
      }
    })

    if (existingToken) {
      await this.prismaService.token.delete({
        where: {
          id: existingToken.id,
          type: TokenType.PASSWORD_RESET
        }
      })
    }

    const passwordResetToken = await this.prismaService.token.create({
      data: {
        email,
        token,
        expiresIn,
        type: TokenType.PASSWORD_RESET
      }
    })

    return passwordResetToken
  }
}
