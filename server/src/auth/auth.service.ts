import { EmailConfirmationService } from './email-confirmation/email-confirmation.service'

import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common'
import { RegisterDto } from './dto/register.dto'
import { UserService } from '@/user/user.service'
import { AuthMethod, SecurityEventActor, SecurityEventType, TokenType, UserRole } from '@/generated/prisma/enums'
import { User } from '@/generated/prisma/client'
import { Request, Response } from 'express'
import { LoginDto } from './dto/login.dto'
import { verify } from 'argon2'
import { ConfigService } from '@nestjs/config'
import { ProviderService } from './provider/provider.service'
import { PrismaService } from '@/prisma/prisma.service'
import { TwoFactorAuthService } from './two-factor-auth/two-factor-auth.service'
import { VerifySmsDto } from './dto/verify-sms.dto'
import { SmsRegisterDto } from './dto/sms-register.dto'
import { SmsCompleteDto } from './dto/sms-complete.dto'
import { normalizePhone } from '@/libs/common/utils/phone.util'
import { PhoneConfirmationService } from '@/libs/phone-confirmation/phone-confirmation.service'
import { getClientIp } from '@/libs/common/utils/request-ip.util'
import { SupportGuestsService } from '@/support/support-guests.service'
import { LoginMethod, SecurityEventsService } from '@/security-events/security-events.service'
import { SessionTokenService } from '@/session/session-token.service'

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly providerService: ProviderService,
    private readonly emailConfirmationService: EmailConfirmationService,
    private readonly twoFactorAuthService: TwoFactorAuthService,
    private readonly phoneConfirmationService: PhoneConfirmationService,
    private readonly supportGuestsService: SupportGuestsService,
    private readonly securityEventsService: SecurityEventsService,
    private readonly sessionTokenService: SessionTokenService
  ) {}

  // Токен из БД сам по себе звонка не доказывает: он создаётся ещё на старте
  // и содержит id проверки у провайдера. Поэтому перед любым действием,
  // которое опирается на «номер подтверждён», заново спрашиваем провайдера.
  private async assertCallConfirmed(phone: string, token: string) {
    const confirmed = await this.phoneConfirmationService.checkCallbackConfirmed(phone, token)

    if (!confirmed) {
      throw new BadRequestException('Звонок не получен. Позвоните на указанный номер и попробуйте снова.')
    }
  }

  async registerSmsStart(dto: SmsRegisterDto, ip?: string) {
    const phone = normalizePhone(dto.phone)

    const isExists = await this.userService.findByPhone(phone)

    if (isExists) {
      throw new ConflictException('Пользователь с таким номером телефона уже зарегистрирован.')
    }

    return this.sendSmsCode(phone, TokenType.SMS_VERIFICATION, ip)
  }

  async registerSmsComplete(req: Request, dto: SmsCompleteDto) {
    const phone = normalizePhone(dto.phone)
    const smsToken = await this.prismaService.token.findFirst({
      where: {
        phone: phone,
        token: dto.code,
        type: TokenType.SMS_VERIFICATION
      }
    })

    if (!smsToken) {
      throw new BadRequestException('Неверный код подтверждения')
    }

    if (new Date() > smsToken.expiresIn) {
      await this.prismaService.token.delete({ where: { id: smsToken.id } })
      throw new BadRequestException('Срок действия кода истек. Запросите новый.')
    }

    await this.assertCallConfirmed(phone, smsToken.token)

    const newUser = await this.userService.create(
      null,
      dto.password,
      dto.name,
      phone,
      '',
      AuthMethod.CREDENTIALS,
      true,
      dto.personalDataConsent,
      { ip: getClientIp(req), userAgent: req.headers['user-agent'] }
    )

    await this.prismaService.token.delete({ where: { id: smsToken.id } })

    return this.saveSession(req, newUser, 'sms')
  }

  async register(req: Request, dto: RegisterDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Укажите Email или номер телефона для регистрации')
    }

    const phone = dto.phone ? normalizePhone(dto.phone) : null

    const emailExists = dto.email ? await this.userService.findByEmail(dto.email) : null

    const phoneExists = phone ? await this.userService.findByPhone(phone) : null

    if (emailExists || phoneExists) {
      throw new ConflictException('Пользователь с таким email или номером телефона уже существует.')
    }

    const newUser = await this.userService.create(
      dto.email ?? null,
      dto.password,
      dto.name,
      phone,
      '',
      AuthMethod.CREDENTIALS,
      false,
      dto.personalDataConsent,
      { ip: getClientIp(req), userAgent: req.headers['user-agent'] }
    )

    if (newUser.email) {
      await this.emailConfirmationService.sendVerificationToken(newUser.email)
      return { message: 'Пожалуйста, подтвердите ваш email.' }
    }

    if (newUser.phones.length) {
      await this.sendSmsCode(newUser.phones[0].phone, TokenType.SMS_VERIFICATION, getClientIp(req))
      return { message: 'Код подтверждения отправлен на ваш телефон.' }
    }

    return {
      message:
        'Вы успешно зарегистрировались. Пожалуйста, подтвердите ваш email. Сообщение было отправлено на ваш почтовый адрес.'
    }
  }

  async sendSmsCode(phone: string, type: TokenType = TokenType.SMS_VERIFICATION, ip?: string) {
    // "Звонок на проверочный номер" — пользователь сам звонит на выданный
    // номер, никакого кода нет вообще (см. PhoneConfirmationService). Вместо
    // кода в поле token храним id проверки у провайдера (sms.ru, а при сбое —
    // Zvonok) — по нему потом (в checkSmsCallbackStatus) опрашиваем, поступил
    // ли звонок. Токен сохраняем только после успешного ответа провайдера,
    // иначе при сбое в базе остался бы "код", о котором фронт никогда не
    // узнает.
    const { callId, number } = await this.phoneConfirmationService.requestCallbackConfirmation(phone, ip)

    // Удаляем старые коды для этого номера
    await this.prismaService.token.deleteMany({
      where: {
        phone,
        type
      }
    })

    const user = await this.userService.findByPhone(phone)

    await this.prismaService.token.create({
      data: {
        phone,
        token: callId,
        type,
        expiresIn: new Date(Date.now() + 5 * 60 * 1000),
        ...(user ? { user: { connect: { id: user.id } } } : {})
      }
    })

    return {
      message: `Позвоните с этого номера на ${number} — подтверждение придёт автоматически`,
      callNumber: number
    }
  }

  // Опрашивается с фронта, пока пользователь не позвонит на выданный
  // номер. Кода тут нет и сверять нечего — как только провайдер подтвердит,
  // что звонок с нужного номера поступил, отдаём фронту сам id проверки
  // (в поле code) — фронт подставляет его в ручки подтверждения
  // (verify-sms/register/sms/complete и т.д.), которые ищут токен по этому
  // значению и дополнительно заново проверяют звонок у провайдера.
  async checkSmsCallbackStatus(phone: string, type: TokenType = TokenType.SMS_VERIFICATION) {
    phone = normalizePhone(phone)

    const smsToken = await this.prismaService.token.findFirst({
      where: { phone, type }
    })

    if (!smsToken) {
      throw new BadRequestException('Код подтверждения не запрошен. Запросите новый.')
    }

    if (new Date() > smsToken.expiresIn) {
      await this.prismaService.token.delete({ where: { id: smsToken.id } })
      throw new BadRequestException('Время ожидания звонка истекло. Запросите новый код.')
    }

    const confirmed = await this.phoneConfirmationService.checkCallbackConfirmed(phone, smsToken.token)

    return confirmed ? { confirmed: true, code: smsToken.token } : { confirmed: false }
  }

  async sendPhoneChangeCode(phone: string, userId: string, ip?: string) {
    phone = normalizePhone(phone)

    const exists = await this.userService.findByPhone(phone)

    if (exists && exists.id !== userId) {
      throw new ConflictException('Этот номер уже используется.')
    }

    return this.sendSmsCode(phone, TokenType.PHONE_CHANGE, ip)
  }

  async confirmPhoneChange(userId: string, phone: string, code: string) {
    phone = normalizePhone(phone)

    const token = await this.prismaService.token.findFirst({
      where: {
        phone,
        token: code,
        type: TokenType.PHONE_CHANGE
      }
    })

    if (!token) {
      throw new BadRequestException('Неверный код подтверждения')
    }

    if (new Date() > token.expiresIn) {
      await this.prismaService.token.delete({
        where: { id: token.id }
      })

      throw new BadRequestException('Срок действия кода истек')
    }

    const exists = await this.userService.findByPhone(phone)

    if (exists && exists.id !== userId) {
      throw new ConflictException('Этот номер уже используется.')
    }

    await this.prismaService.userPhone.deleteMany({
      where: {
        userId
      }
    })

    await this.prismaService.userPhone.create({
      data: {
        phone,
        userId,
        isPrimary: true,
        isVerified: true
      }
    })

    await this.prismaService.token.delete({
      where: {
        id: token.id
      }
    })

    return {
      success: true
    }
  }

  async verifySms(req: Request, dto: VerifySmsDto) {
    const phone = normalizePhone(dto.phone)

    const smsToken = await this.prismaService.token.findFirst({
      where: {
        phone,
        token: dto.code,
        type: TokenType.SMS_VERIFICATION
      }
    })

    if (!smsToken) {
      throw new BadRequestException('Неверный код подтверждения или номер телефона')
    }

    if (new Date() > smsToken.expiresIn) {
      await this.prismaService.token.delete({ where: { id: smsToken.id } })
      throw new BadRequestException('Срок действия кода истек. Запросите новый.')
    }

    await this.assertCallConfirmed(phone, smsToken.token)

    const user = await this.userService.findByPhone(phone)

    if (!user) {
      throw new NotFoundException('Пользователь с таким номером не найден')
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { isVerified: true }
    })

    await this.prismaService.token.delete({ where: { id: smsToken.id } })

    return this.saveSession(req, user, 'sms')
  }

  async checkRegisterCode(dto: { phone: string; code: string }) {
    const phone = normalizePhone(dto.phone)

    const smsToken = await this.prismaService.token.findFirst({
      where: {
        phone,
        token: dto.code,
        type: TokenType.SMS_VERIFICATION
      }
    })

    if (!smsToken) {
      throw new BadRequestException('Неверный код подтверждения')
    }

    if (new Date() > smsToken.expiresIn) {
      await this.prismaService.token.delete({ where: { id: smsToken.id } })
      throw new BadRequestException('Срок действия кода истек. Запросите новый.')
    }

    await this.assertCallConfirmed(phone, smsToken.token)

    return { success: true }
  }

  async checkUser(dto: { identifier: string }) {
    const isEmail = dto.identifier.includes('@')
    let user: User | null = null

    if (isEmail) {
      user = await this.userService.findByEmail(dto.identifier)
    } else {
      const phone = normalizePhone(dto.identifier)
      user = await this.userService.findByPhone(phone)
    }

    return {
      exists: !!user,
      type: isEmail ? 'EMAIL' : 'PHONE',
      identifier: dto.identifier
    }
  }

  // Вход через соцсеть на сайте: найти/создать пользователя и сразу открыть
  // сессию в этом же запросе (браузер пришёл на колбэк со своей cookie).
  async extractProfileFromCode(req: Request, provider: string, code: string) {
    const { user, isNewUser } = await this.resolveOAuthUser(req, provider, code)

    await this.saveSession(req, user, 'oauth')

    return { isNewUser }
  }

  // Вход через соцсеть в мобильном приложении: колбэк провайдера приходит
  // из системного браузера, а сессию нужно открыть в приложении — поэтому
  // здесь только находим/создаём пользователя, а сессию откроет
  // completeMobileOAuth уже в запросе самого приложения (см.
  // MobileOAuthService). Так сессия не остаётся заодно в cookie браузера, а
  // журнал безопасности видит IP и устройство приложения.
  async resolveOAuthUser(req: Request, provider: string, code: string): Promise<{ user: User; isNewUser: boolean }> {
    const providerInstance = this.providerService.findByService(provider)
    const profile = await providerInstance?.findUserByCode(code)

    const account = await this.prismaService.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: profile?.provider ?? '',
          providerAccountId: profile?.id ?? '' // Это ID из соцсети
        }
      }
    })

    let user = account?.userId ? await this.userService.findById(account.userId) : null

    if (!user && profile?.email) {
      user = await this.userService.findByEmail(profile.email)
    }

    if (user) {
      if (!account) {
        await this.prismaService.account.create({
          data: {
            userId: user.id,
            type: 'oauth',
            provider: profile?.provider ?? '',
            providerAccountId: profile?.id ?? '',
            accessToken: profile?.access_token,
            refreshToken: profile?.refresh_token ?? null,
            expiresAt: profile?.expires_at ?? 0
          }
        })

        // Соцсеть автоматически привязана к УЖЕ существующему аккаунту по
        // совпадению email (см. поиск user выше) — это отдельный путь
        // получить доступ к аккаунту, поэтому он в журнале безопасности.
        await this.securityEventsService.record({
          userId: user.id,
          type: SecurityEventType.OAUTH_LINKED,
          metadata: { provider: profile?.provider ?? '' }
        })
      }
      // isNewUser — контроллер использует его, чтобы отправить фронт с
      // ?newUser=1 (см. AuthController.callback) для цели "registration" в
      // Яндекс.Метрике (F15 в ROADMAP.md). У OAuth нет отдельного шага
      // "нажал Зарегистрироваться" — вход и регистрация неотличимы для
      // пользователя, поэтому единственный надёжный признак "это новый
      // аккаунт" — то, что мы сами только что создали его ниже, а не нашли
      // существующий.
      return { user, isNewUser: false }
    }

    const providerKey = (profile?.provider?.toUpperCase() ?? '') as keyof typeof AuthMethod
    const method: AuthMethod = AuthMethod[providerKey] || AuthMethod.GOOGLE

    // Согласие на обработку персональных данных для OAuth-регистрации не
    // оформляется отдельным чекбоксом (тут нет формы — сразу редирект на
    // Google/Яндекс), а подразумевается уведомлением рядом с кнопками входа
    // через соцсети на форме регистрации (см. AuthFormWrapper/AuthSocials).
    user = await this.userService.create(
      profile?.email ?? null,
      null,
      profile?.name ?? '',
      null,
      profile?.picture ?? '',
      method,
      true,
      true,
      { ip: getClientIp(req), userAgent: req.headers['user-agent'] }
    )

    if (!account) {
      await this.prismaService.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: profile?.provider ?? '',
          providerAccountId: profile?.id ?? '', // <--- ДОБАВЬ ЭТУ СТРОКУ
          accessToken: profile?.access_token,
          refreshToken: profile?.refresh_token ?? null,
          expiresAt: profile?.expires_at ?? 0
        }
      })
    }

    return { user, isNewUser: true }
  }

  // Вторая половина входа через соцсеть в приложении (см. resolveOAuthUser):
  // одноразовый код уже проверен MobileOAuthService, тут только открываем
  // сессию. Аккаунт за время между колбэком и обменом кода могли удалить —
  // такого пользователя не впускаем.
  async completeMobileOAuth(req: Request, userId: string) {
    const user = await this.userService.findById(userId)

    if (user.deletedAt) {
      throw new UnauthorizedException('Аккаунт удалён')
    }

    return this.saveSession(req, user, 'oauth')
  }

  async login(req: Request, dto: LoginDto) {
    const isEmail = dto.login.includes('@')
    let user: User | null = null

    if (isEmail) {
      user = await this.userService.findByEmail(dto.login)
    } else {
      const phone = normalizePhone(dto.login)

      user = await this.userService.findByPhone(phone)
    }

    if (!user || !user.password) {
      throw new NotFoundException('Пользователь не найден. Пожалуйста, проверьте введенные данные.')
    }

    const isValidPassword = await verify(user.password, dto.password)

    if (!isValidPassword) {
      throw new UnauthorizedException(
        'Неверный пароль. Пожалуйста, попробуйте еще раз, или восстановите пароль, если забыли его.'
      )
    }

    if (!user.isVerified && user.email) {
      await this.emailConfirmationService.sendVerificationToken(user.email)
      throw new UnauthorizedException('Ваш email не подтвержден. Пожалуйста, проверьте вашу почту и подтвердите адрес.')
    }

    if (user.isTwoFactorEnabled && user.email) {
      if (!dto.code) {
        await this.twoFactorAuthService.sendTwoFactorToken(user.email)

        return {
          message: 'Проверьте вашу почту. Требуется код двухфакторной аутентификации.'
        }
      }

      await this.twoFactorAuthService.validateTwoFactorToken(user.email, dto.code)
    }

    return this.saveSession(req, user, 'password')
  }

  async logout(req: Request, res: Response): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.destroy(err => {
        if (err) {
          return reject(
            new InternalServerErrorException(
              'Не удалось завершить сессию. Возможно, возникла проблема с сервером, или сессия уже была завершена.'
            )
          )
        }

        res.clearCookie(this.configService.getOrThrow<string>('SESSION_NAME'))
        resolve()
      })
    })
  }

  // saveSession — единственная точка, через которую проходит вход/регистрация
  // независимо от способа (пароль, SMS, Google, Yandex — см. все вызовы
  // this.saveSession выше), поэтому это самое надёжное место для
  // автоповышения роли: сработает при любом способе входа, без дублирования
  // проверки в каждом методе отдельно.
  async saveSession(req: Request, user: User, loginMethod: LoginMethod = 'password') {
    const role = await this.ensureAdminRole(user)

    // "Долг" в ROADMAP.md — склейка гостя поддержки с аккаунтом. Если в
    // ЭТОЙ ЖЕ сессии до входа/регистрации посетитель уже писал в чат
    // поддержки (см. SupportGuestsService.getOrCreateForSession —
    // единственное место, где вообще появляется supportGuestId), его
    // гостевой диалог переезжает на новый userId. fire-and-forget и
    // отдельный catch — перенос переписки не должен ронять сам вход, если
    // вдруг не удастся: гость просто останется гостем, ничего не
    // потеряется (guestConversation никуда не денется). Само поле чистим
    // из сессии сразу — дальше SupportIdentityService всё равно смотрит
    // сначала на userId, но незачем оставлять в сессии id, который уже
    // никогда не должен использоваться как гостевой.
    const supportGuestId = req.session.supportGuestId

    if (supportGuestId) {
      delete req.session.supportGuestId

      void this.supportGuestsService.mergeIntoUser(supportGuestId, user.id).catch(error => {
        console.error('SUPPORT GUEST MERGE ERROR:', error)
      })
    }

    await new Promise<void>((resolve, reject) => {
      req.session.userId = user.id
      req.session.userRole = role

      req.session.save(err => {
        if (err) {
          console.error('SESSION SAVE ERROR:', err)
          return reject(
            new InternalServerErrorException(
              'Не удалось сохранить сессию. Проверьте правильно ли настроены параметры сессии.'
            )
          )
        }

        resolve()
      })
    })

    // Журнал безопасности: вход с нового устройства/IP (повторные входы с
    // уже знакомого места не пишем — см. SecurityEventsService.recordLoginIfNew).
    // Только после успешного сохранения сессии — не успевший войти не
    // должен попадать в журнал как вошедший.
    await this.securityEventsService.recordLoginIfNew(user.id, loginMethod)

    // Профиль — в том же безопасном виде, что и GET /users/profile: без
    // хэша пароля и OAuth-токенов. Раньше сюда уходила сырая запись из базы
    // целиком (вместе с хэшем пароля) — сайт её не читал, но в ответ она
    // попадала. Роль после ensureAdminRole уже записана в базу, поэтому
    // профиль, прочитанный заново, её учитывает.
    const profile = await this.userService.getProfileForClient(user.id)
    // Ключ сессии — только для мобильного приложения (см. SessionTokenService).
    const sessionToken = this.sessionTokenService.issueFor(req)

    return sessionToken ? { user: profile, sessionToken } : { user: profile }
  }

  // Автоповышение до ADMIN по списку почт из переменной окружения
  // ADMIN_EMAILS (через запятую) — решает проблему курицы и яйца: самого
  // первого админа неоткуда назначить через интерфейс, потому что сам
  // интерфейс администрирования будет защищён ролью ADMIN, которой ни у кого
  // ещё нет. Достаточно один раз прописать свою почту в ADMIN_EMAILS на
  // сервере — при следующем входе роль проставится сама, без ручных правок в
  // БД. Дальше, когда в админке появится управление пользователями, НОВЫХ
  // админов уже можно будет назначать через интерфейс, а не через .env.
  private async ensureAdminRole(user: User): Promise<UserRole> {
    if (user.role === UserRole.ADMIN || !user.email) {
      return user.role
    }

    const adminEmails = (this.configService.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean)

    if (!adminEmails.includes(user.email.toLowerCase())) {
      return user.role
    }

    const updated = await this.prismaService.user.update({
      where: { id: user.id },
      data: { role: UserRole.ADMIN }
    })

    // Повышение роли без участия человека (по ADMIN_EMAILS) — самое важное
    // событие безопасности из возможных, поэтому актор SYSTEM явно (запрос
    // в этот момент формально есть — это вход самого пользователя, но
    // роль выдал не он).
    await this.securityEventsService.record({
      userId: user.id,
      type: SecurityEventType.ROLE_CHANGED,
      actor: SecurityEventActor.SYSTEM,
      metadata: { from: user.role, to: updated.role }
    })

    return updated.role
  }
}
