import { BadRequestException, HttpException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getPhoneCountry, isPossiblePhone, parseAllowedCountries } from '@/libs/common/utils/phone.util'
import { SmsRuService } from '@/libs/smsru/smsru.service'
import { ZvonokService } from '@/libs/zvonok/zvonok.service'

export type PhoneConfirmationProvider = 'smsru' | 'zvonok'

// Провайдер зашивается в сам токен ("sr:<id>" / "zv:<id>"): токен хранится в
// БД и целиком уходит на фронт и обратно, поэтому проверка статуса всегда
// идёт у того провайдера, который выдал проверку — даже если за эти 5 минут
// переключили PHONE_CONFIRM_PROVIDER или сработал резерв. Токены без префикса
// — старые, выданные до появления sms.ru, это всегда «Звонок».
const PREFIX: Record<PhoneConfirmationProvider, string> = { smsru: 'sr:', zvonok: 'zv:' }

// Единая точка подтверждения номера звонком: sms.ru основной, «Звонок» —
// запасной. Основной провайдер выбирается PHONE_CONFIRM_PROVIDER, а если
// переменная не задана — sms.ru, как только в окружении есть SMSRU_API_ID
// (до этого всё работает как раньше, на «Звонке»).
@Injectable()
export class PhoneConfirmationService {
  private readonly logger = new Logger(PhoneConfirmationService.name)

  constructor(
    private readonly configService: ConfigService,
    private readonly smsRuService: SmsRuService,
    private readonly zvonokService: ZvonokService
  ) {}

  getPrimaryProvider(): PhoneConfirmationProvider {
    const explicit = this.configService.get<string>('PHONE_CONFIRM_PROVIDER')

    if (explicit === 'smsru' || explicit === 'zvonok') return explicit

    return this.configService.get<string>('SMSRU_API_ID') ? 'smsru' : 'zvonok'
  }

  // ip — адрес пользователя (не сервера): sms.ru по нему решает, какой номер
  // выдать звонящему из-за границы. «Звонок» его не использует.
  async requestCallbackConfirmation(phone: string, ip?: string): Promise<{ callId: string; number: string }> {
    this.assertPhoneAllowed(phone)

    if (this.getPrimaryProvider() === 'zvonok') {
      return this.requestViaZvonok(phone)
    }

    try {
      return await this.requestViaSmsRu(phone, ip)
    } catch (error) {
      // Ошибки уровня «неверный номер» (4xx) резерв не лечит. А вот сбой самого
      // sms.ru для российского номера — повод попробовать «Звонок»: он умеет
      // только Россию, поэтому для иностранных номеров резерва нет.
      if ((error instanceof HttpException && error.getStatus() < 500) || !this.canFallbackToZvonok(phone)) {
        throw error
      }

      this.logger.warn(`sms.ru не ответил, подтверждаем номер через «Звонок»: ${(error as Error).message}`)

      return this.requestViaZvonok(phone)
    }
  }

  async checkCallbackConfirmed(phone: string, token: string): Promise<boolean> {
    if (token.startsWith(PREFIX.smsru)) {
      return this.smsRuService.checkCallbackConfirmed(token.slice(PREFIX.smsru.length))
    }

    const callId = token.startsWith(PREFIX.zvonok) ? token.slice(PREFIX.zvonok.length) : token

    return this.zvonokService.checkCallbackConfirmed(phone, callId)
  }

  private async requestViaSmsRu(phone: string, ip?: string) {
    const { callId, number } = await this.smsRuService.requestCallbackConfirmation(phone, ip)

    return { callId: `${PREFIX.smsru}${callId}`, number }
  }

  private async requestViaZvonok(phone: string) {
    const { callId, number } = await this.zvonokService.requestCallbackConfirmation(phone)

    return { callId: `${PREFIX.zvonok}${callId}`, number }
  }

  // Номер должен быть корректным по длине и коду страны. Если задан
  // PHONE_ALLOWED_COUNTRIES, дополнительно требуем, чтобы он был из одной из
  // перечисленных стран (по умолчанию ограничения нет). Проверяем до обращения
  // к провайдеру, чтобы не тратить запросы на заведомо неподходящие номера.
  private assertPhoneAllowed(phone: string): void {
    if (!isPossiblePhone(phone)) {
      throw new BadRequestException('Номер телефона указан неверно. Проверьте номер и попробуйте снова.')
    }

    const allowed = parseAllowedCountries(this.configService.get<string>('PHONE_ALLOWED_COUNTRIES'))

    if (!allowed) return

    const country = getPhoneCountry(phone)

    // Россия и Казахстан делят код +7: если страну по цифрам определить не
    // удалось, номер на «7» считаем российским (как раньше).
    const effectiveCountry = country ?? (phone.startsWith('7') ? 'RU' : undefined)

    if (!effectiveCountry || !allowed.includes(effectiveCountry)) {
      throw new BadRequestException(
        'Подтверждение номеров этой страны пока недоступно. Попробуйте номер другой страны или напишите в поддержку.'
      )
    }
  }

  // «Звонок» умеет только Россию: казахстанский номер тоже начинается на «7»,
  // но резервом его проверять бессмысленно.
  private canFallbackToZvonok(phone: string): boolean {
    return getPhoneCountry(phone) === 'RU' && Boolean(this.configService.get<string>('ZVONOK_PUBLIC_KEY'))
  }
}
