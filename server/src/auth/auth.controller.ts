import { ConfigService } from '@nestjs/config'
import { ProviderService } from './provider/provider.service'
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { Request, Response } from 'express'
import { getClientIp } from '@/libs/common/utils/request-ip.util'
import { LoginDto } from './dto/login.dto'
import { Captcha } from '@/libs/captcha/captcha.decorator'
import { AuthProviderGuard } from './guards/provider.quard'
import { CheckUserDto } from './dto/check-user.dto'
import { VerifySmsDto } from './dto/verify-sms.dto'
import { SmsRegisterDto } from './dto/sms-register.dto'
import { SmsCompleteDto } from './dto/sms-complete.dto'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { randomBytes } from 'crypto'
import { OAuthConnectQueryDto } from './dto/oauth-connect-query.dto'
import { MobileOAuthExchangeDto } from './dto/mobile-oauth-exchange.dto'
import { MobileOAuthService, appendQuery } from './mobile-oauth/mobile-oauth.service'
import { isTokenTransportRequest } from '@/session/session-token'

// Более мягкий лимит для запроса самого кода (SMS/email) — раз в 30 секунд
// не даёт спамить провайдера SMS/почты, но не мешает нормальному пользователю.
const REQUEST_CODE_THROTTLE = { default: { limit: 3, ttl: 60000 } }

// Более жёсткий лимит для проверки кода — именно здесь возможен брутфорс.
const VERIFY_CODE_THROTTLE = { default: { limit: 5, ttl: 60000 } }

// Лимит для опроса статуса звонка (polling с фронта каждые несколько
// секунд, пока ждём, что пользователь позвонит на проверочный номер) —
// это не попытки подбора, ограничиваем только от совсем частого спама.
const POLL_STATUS_THROTTLE = { default: { limit: 30, ttl: 60000 } }

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name)

  constructor(
    private readonly authService: AuthService,
    private readonly providerService: ProviderService,
    private readonly configService: ConfigService,
    private readonly mobileOAuthService: MobileOAuthService
  ) {}

  @UseGuards(ThrottlerGuard)
  @Throttle(REQUEST_CODE_THROTTLE)
  @Post('register/sms/start')
  @HttpCode(HttpStatus.OK)
  async registerSmsStart(@Req() req: Request, @Body() dto: SmsRegisterDto) {
    // IP пользователя (не сервера) нужен sms.ru, чтобы выдать звонящему из-за
    // границы обычный номер вместо 8-800 — см. SmsRuService.
    return this.authService.registerSmsStart(dto, getClientIp(req))
  }

  @UseGuards(ThrottlerGuard)
  @Throttle(VERIFY_CODE_THROTTLE)
  @Post('register/sms/complete')
  @HttpCode(HttpStatus.OK)
  async registerSmsComplete(@Req() req: Request, @Body() dto: SmsCompleteDto) {
    return this.authService.registerSmsComplete(req, dto)
  }

  @UseGuards(ThrottlerGuard)
  @Throttle(VERIFY_CODE_THROTTLE)
  @Post('verify-sms')
  @HttpCode(HttpStatus.OK)
  async verifySms(@Req() req: Request, @Body() dto: VerifySmsDto) {
    return this.authService.verifySms(req, dto)
  }

  @UseGuards(ThrottlerGuard)
  @Throttle(VERIFY_CODE_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('register/check-code')
  async checkRegisterCode(@Body() dto: VerifySmsDto) {
    return this.authService.checkRegisterCode(dto)
  }

  // Опрашивается с фронта каждые несколько секунд, пока пользователь не
  // позвонит на выданный номер (см. AuthService.checkSmsCallbackStatus) —
  // лимит выше, чем у ручной проверки кода, это не брутфорс, а обычный polling.
  @UseGuards(ThrottlerGuard)
  @Throttle(POLL_STATUS_THROTTLE)
  @HttpCode(HttpStatus.OK)
  @Post('register/sms/status')
  async checkSmsCallbackStatus(@Body() dto: SmsRegisterDto) {
    return this.authService.checkSmsCallbackStatus(dto.phone)
  }

  @Captcha()
  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Req() req: Request, @Body() dto: RegisterDto) {
    return this.authService.register(req, dto)
  }

  @UseGuards(ThrottlerGuard)
  @Throttle(VERIFY_CODE_THROTTLE)
  @Post('check-user')
  @HttpCode(HttpStatus.OK)
  async checkUser(@Body() dto: CheckUserDto) {
    return this.authService.checkUser(dto)
  }

  @Captcha()
  @UseGuards(ThrottlerGuard)
  @Throttle(VERIFY_CODE_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Req() req: Request, @Body() dto: LoginDto) {
    return this.authService.login(req, dto)
  }

  @UseGuards(AuthProviderGuard)
  @Get('/oauth/connect/:provider')
  async connect(@Param('provider') provider: string, @Req() req: Request, @Query() query: OAuthConnectQueryDto) {
    const providerInstance = this.providerService.findByService(provider)

    if (!providerInstance) {
      throw new BadRequestException(`Провайдер "${provider}" не найден.`)
    }

    // Мобильное приложение: state и отпечаток секрета приложения — в Redis,
    // а не в сессии (см. MobileOAuthService).
    if (query.redirectUri !== undefined || query.codeChallenge !== undefined) {
      if (!query.redirectUri || !query.codeChallenge) {
        throw new BadRequestException('Для входа из приложения нужны redirectUri и codeChallenge.')
      }

      const state = await this.mobileOAuthService.createAuthRequest(query.redirectUri, query.codeChallenge)

      return { url: providerInstance.getAuthUrl(state) }
    }

    // Защита от OAuth login CSRF: генерируем одноразовое значение,
    // кладём его в сессию и сверяем с тем, что провайдер вернёт в callback.
    const state = randomBytes(16).toString('hex')
    req.session.oauthState = state

    return {
      url: providerInstance.getAuthUrl(state)
    }
  }

  @Get('/oauth/callback/:provider')
  @UseGuards(AuthProviderGuard)
  async callback(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query('code') code: string,
    @Query('state') state: string,
    @Param('provider') provider: string
  ) {
    // Вход из мобильного приложения (state выдан MobileOAuthService) —
    // возвращаем пользователя в приложение, а не на сайт. Ошибки тоже
    // отдаём приложению параметром: в системном браузере JSON-ответ с
    // ошибкой выглядел бы как сломанная страница, а приложение покажет
    // нормальное сообщение.
    const mobileRequest = await this.mobileOAuthService.consumeAuthRequest(state)

    if (mobileRequest) {
      if (!code) {
        return res.redirect(appendQuery(mobileRequest.redirectUri, { error: 'Вход отменён.' }))
      }

      try {
        const { user, isNewUser } = await this.authService.resolveOAuthUser(req, provider, code)
        const ticket = await this.mobileOAuthService.issueTicket({
          userId: user.id,
          isNewUser,
          codeChallenge: mobileRequest.codeChallenge
        })

        return res.redirect(appendQuery(mobileRequest.redirectUri, { ticket }))
      } catch (error) {
        // Текст показываем только у «наших» ошибок (HttpException с
        // сообщением для пользователя) — внутренние детали (сбой базы и т.п.)
        // в адрес возврата не уходят.
        if (!(error instanceof HttpException)) {
          this.logger.error('Mobile OAuth callback failed', error instanceof Error ? error.stack : String(error))
        }

        const message = error instanceof HttpException ? error.message : 'Не удалось войти. Попробуйте ещё раз.'

        return res.redirect(appendQuery(mobileRequest.redirectUri, { error: message }))
      }
    }

    if (!code) {
      throw new BadRequestException('Не был предоставлен код авторизации.')
    }

    const expectedState = req.session.oauthState
    delete req.session.oauthState

    if (!expectedState || !state || state !== expectedState) {
      throw new BadRequestException(
        'Запрос авторизации недействителен или устарел (несовпадение state). Пожалуйста, попробуйте войти снова.'
      )
    }

    const { isNewUser } = await this.authService.extractProfileFromCode(req, provider, code)

    // /profile/settings — это просто server-side redirect() на
    // /profile/settings/general (см. app/(main)/profile/settings/page.tsx),
    // а next/navigation.redirect() не переносит query-строку исходного
    // запроса на новый URL — ?newUser=1 отсюда до RegistrationGoalHandler
    // просто не долетел бы. Ведём сразу на конечный адрес.
    // isNewUser — единственный способ узнать на фронте, что это только что
    // созданный аккаунт (не просто "оба пути ведут на одну страницу" — у
    // входа через соцсеть нет отдельного экрана "Регистрация", см.
    // AuthService.extractProfileFromCode), нужен для цели "registration" в
    // Яндекс.Метрике (F15 в ROADMAP.md).
    const redirectPath = isNewUser ? '/profile/settings/general?newUser=1' : '/profile/settings/general'

    return res.redirect(`${this.configService.getOrThrow<string>('ALLOWED_ORIGIN')}${redirectPath}`)
  }

  // Вторая половина входа через соцсеть из приложения: одноразовый ticket из
  // редиректа + исходный секрет приложения → сессия и её ключ. Лимит как у
  // проверки кодов — это тоже место, где возможен перебор.
  @UseGuards(ThrottlerGuard)
  @Throttle(VERIFY_CODE_THROTTLE)
  @Post('oauth/mobile/exchange')
  @HttpCode(HttpStatus.OK)
  async exchangeMobileOAuthTicket(@Req() req: Request, @Body() dto: MobileOAuthExchangeDto) {
    // Ключ сессии отдаётся только с X-Auth-Transport: token. Без него обмен
    // открыл бы сессию, ключ от которой никто не получит, — сразу отказываем.
    if (!isTokenTransportRequest(req)) {
      throw new BadRequestException('Ручка доступна только мобильному приложению.')
    }

    const { userId, isNewUser } = await this.mobileOAuthService.redeemTicket(dto.ticket, dto.codeVerifier)
    const session = await this.authService.completeMobileOAuth(req, userId)

    return { ...session, isNewUser }
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req, res)
  }
}
