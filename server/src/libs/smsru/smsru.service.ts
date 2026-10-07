import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { isIP } from 'node:net'

interface SmsRuCallCheckAddResponse {
  status?: string
  status_code?: number
  check_id?: string
  call_phone?: string
  call_phone_pretty?: string
}

interface SmsRuCallCheckStatusResponse {
  status?: string
  status_code?: number
  check_status?: string | number
}

const SMSRU_BASE_URL = 'https://sms.ru'
const REQUEST_TIMEOUT_MS = 10_000

// Коды ответа callcheck из документации sms.ru (https://sms.ru/api/call).
const STATUS_ACCEPTED = 100
const STATUS_INVALID_PHONE = 202
const CHECK_CONFIRMED = '401'

// IP нужен sms.ru, чтобы понять, находится ли пользователь за границей:
// из роуминга на номер 8-800 не позвонить, и таким пользователям вместо него
// выдаётся обычный номер. Приватные/локальные адреса (dev, docker-сеть)
// ничего не говорят о местонахождении человека — их не отправляем вовсе.
function normalizeClientIp(ip?: string): string | undefined {
  if (!ip) return undefined

  const value = ip.startsWith('::ffff:') ? ip.slice(7) : ip
  const version = isIP(value)

  if (version === 4) {
    const [a, b] = value.split('.').map(Number)
    const isPrivate =
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)

    return isPrivate ? undefined : value
  }

  if (version === 6) {
    const lower = value.toLowerCase()
    const isLocal = lower === '::1' || lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80')

    return isLocal ? undefined : value
  }

  return undefined
}

// "Авторизация по звонку" sms.ru (callcheck): пользователь сам звонит на
// выданный номер, sms.ru сбрасывает звонок (для звонящего он бесплатен, в
// том числе из-за рубежа) и сообщает, что звонок был. Контракт методов тот
// же, что у ZvonokService, — выбор между ними делает PhoneConfirmationService.
@Injectable()
export class SmsRuService {
  private readonly logger = new Logger(SmsRuService.name)

  constructor(private readonly configService: ConfigService) {}

  // Регистрирует у sms.ru ожидание звонка с указанного номера. check_id
  // возвращаем как callId — по нему потом опрашиваем статус. IP — адрес
  // ПОЛЬЗОВАТЕЛЯ (не сервера), см. normalizeClientIp.
  async requestCallbackConfirmation(phone: string, ip?: string): Promise<{ callId: string; number: string }> {
    const apiId = this.configService.getOrThrow<string>('SMSRU_API_ID')

    const params = new URLSearchParams({ api_id: apiId, phone, json: '1' })
    const clientIp = normalizeClientIp(ip)

    if (clientIp) params.set('ip', clientIp)

    let response: globalThis.Response

    try {
      response = await fetch(`${SMSRU_BASE_URL}/callcheck/add?${params}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch (error) {
      // В лог не пишем URL запроса: в нём api_id.
      this.logger.error(`SMS.RU недоступен: ${(error as Error).message}`)

      throw new InternalServerErrorException(
        'Не удалось связаться с сервисом подтверждения номера. Попробуйте чуть позже.'
      )
    }

    const data = (await response.json().catch(() => null)) as SmsRuCallCheckAddResponse | null

    if (data?.status_code === STATUS_INVALID_PHONE) {
      throw new BadRequestException('Номер телефона указан неверно. Проверьте номер и попробуйте снова.')
    }

    if (!response.ok || data?.status_code !== STATUS_ACCEPTED || !data.check_id || !data.call_phone) {
      this.logger.error(`SMS.RU callcheck/add не удался: HTTP ${response.status}, status_code=${data?.status_code}`)

      throw new InternalServerErrorException(
        'Не удалось подготовить проверку номера. Проверьте номер телефона и попробуйте снова.'
      )
    }

    return {
      callId: String(data.check_id),
      number: data.call_phone_pretty ?? `+${data.call_phone}`
    }
  }

  // Опрашивается с фронта каждые несколько секунд. Сбой сети не должен
  // превращаться в ошибку на экране — просто считаем, что пока не
  // подтверждено, фронт спросит ещё раз.
  async checkCallbackConfirmed(callId: string): Promise<boolean> {
    const apiId = this.configService.getOrThrow<string>('SMSRU_API_ID')

    const params = new URLSearchParams({ api_id: apiId, check_id: callId, json: '1' })

    let response: globalThis.Response

    try {
      response = await fetch(`${SMSRU_BASE_URL}/callcheck/status?${params}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      })
    } catch (error) {
      this.logger.error(`SMS.RU недоступен при проверке статуса: ${(error as Error).message}`)

      return false
    }

    if (!response.ok) {
      return false
    }

    const data = (await response.json().catch(() => null)) as SmsRuCallCheckStatusResponse | null

    return data?.status_code === STATUS_ACCEPTED && String(data.check_status) === CHECK_CONFIRMED
  }
}
