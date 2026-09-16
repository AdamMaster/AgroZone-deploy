import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

interface ZvonokTellCodeResponse {
  status: string
  data?: {
    balance: string
    call_id: number
    created: string
    phone: string
    pincode: string
  }
}

interface ZvonokConfirmResponse {
  status: string
  data?: {
    balance: string
    call_id: number
    created: string
    phone: string
    pincode: string
    // Новое поле от zvonok, появилось после их уведомления о блокировке
    // операторами номера +7 930 555-86-07 (который раньше был жёстко
    // прописан в ZVONOK_CONFIRM_NUMBER) — список номеров, реально
    // доступных для звонка ПРЯМО СЕЙЧАС. Форма поля в их официальной
    // API-документации (api-docs.zvonok.com) на момент написания не
    // описана (обновили только в уведомлении в кабинете) — поэтому тип
    // unknown и разбираем его максимально защищённо в extractPhoneNumbers.
    allowed_phones_for_call?: unknown
  }
}

interface ZvonokCallStatus {
  call_id: number
  status: string
  status_display: string
  dial_status: number
  dial_status_display: string
  completed: string | null
}

// allowed_phones_for_call может прийти как массив строк ("+79991234567")
// или как массив объектов ({ phone: "..." } / { number: "..." }) — в их
// уведомлении не было точного формата, поэтому разбираем оба варианта, а
// всё, что не удалось распознать, просто отбрасываем, а не роняем весь
// запрос подтверждения.
function extractPhoneNumbers(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []

  return raw
    .map(entry => {
      if (typeof entry === 'string') return entry

      if (entry && typeof entry === 'object') {
        const obj = entry as Record<string, unknown>

        if (typeof obj.phone === 'string') return obj.phone
        if (typeof obj.number === 'string') return obj.number
      }

      return null
    })
    .filter((value): value is string => Boolean(value && value.trim()))
}

// zvonok отдаёт номера в allowed_phones_for_call слитно, без пробелов и
// дефисов (например "+79305558607"), а исторически ZVONOK_CONFIRM_NUMBER
// в .env был записан в читаемом виде ("+7 930 555-86-07") — именно так он
// и показывался пользователю в сообщении "Позвоните с этого номера на
// ...". Чтобы при переключении на номера из ответа zvonok сообщение не
// стало менее читаемым, форматируем единообразно вне зависимости от
// источника номера.
function formatPhoneForDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '')

  // Ожидаем российский номер из 11 цифр (7XXXXXXXXXX). Если формат
  // неожиданный — просто возвращаем как пришло, чтобы не исказить
  // непредвиденное значение от zvonok молча.
  if (digits.length !== 11) return raw

  const country = digits[0]
  const part1 = digits.slice(1, 4)
  const part2 = digits.slice(4, 7)
  const part3 = digits.slice(7, 9)
  const part4 = digits.slice(9, 11)

  return `+${country} ${part1} ${part2}-${part3}-${part4}`
}

@Injectable()
export class ZvonokService {
  private readonly logger = new Logger(ZvonokService.name)

  constructor(private readonly configService: ConfigService) {}

  // Не используется активно (заменено на requestCallbackConfirmation +
  // checkCallbackConfirmed, см. ниже) — оставлен на случай, если придётся
  // откатиться на диктовку кода роботом.
  async sendVerificationCall(phone: string): Promise<string> {
    const publicKey = this.configService.getOrThrow<string>('ZVONOK_PUBLIC_KEY')
    const campaignId = this.configService.getOrThrow<string>('ZVONOK_CAMPAIGN_ID')

    const formData = new FormData()

    formData.append('public_key', publicKey)
    formData.append('phone', `+${phone}`)
    formData.append('campaign_id', campaignId)

    let response: globalThis.Response

    try {
      // tellcode — робот дозванивается и голосом диктует код (в отличие от
      // flashcall, где код был просто последними цифрами номера, с которого
      // звонили, и трубку брать было не нужно). Кампания в кабинете zvonok
      // должна быть типа "Диктовка кода роботом", ZVONOK_CAMPAIGN_ID — id
      // именно такой кампании.
      response = await fetch('https://zvonok.com/manager/cabapi_external/api/v1/phones/tellcode/', {
        method: 'POST',
        body: formData
      })
    } catch (error) {
      this.logger.error('Zvonok недоступен', error as Error)

      throw new InternalServerErrorException(
        'Не удалось связаться с сервисом подтверждения номера. Попробуйте чуть позже.'
      )
    }

    const data = (await response.json().catch(() => null)) as ZvonokTellCodeResponse | null

    if (!response.ok || data?.status !== 'ok' || !data.data?.pincode) {
      this.logger.error(`Zvonok tellcode не удался: ${response.status} ${JSON.stringify(data)}`)

      throw new InternalServerErrorException(
        'Не удалось совершить звонок с кодом подтверждения. Проверьте номер телефона и попробуйте снова.'
      )
    }

    return data.data.pincode
  }

  // "Звонок на проверочный номер" — в отличие от tellcode/flashcall, тут
  // МЫ никому не звоним. Пользователь сам звонит на общий бесплатный номер
  // zvonok, а мы узнаём об этом через checkCallbackConfirmed. Этот метод
  // только регистрирует у zvonok ожидание такого звонка с указанного
  // номера и возвращает call_id — именно по нему потом ищем совпадение в
  // calls_by_phone.
  //
  // Причина перехода на этот способ: исходящие звонки робота (flashcall,
  // tellcode) операторы всё чаще блокируют антиспам-фильтрами как
  // "звонки от бизнеса" — если номер в zvonok не идентифицирован, звонок
  // может просто не дойти. Входящий звонок ОТ пользователя такими
  // фильтрами не режется.
  //
  // Номер, на который звонить, раньше брался ЖЁСТКО из ZVONOK_CONFIRM_NUMBER
  // и никогда не проверялся на актуальность — когда оператор заблокировал
  // именно этот номер (см. уведомление zvonok в кабинете, номер
  // +7 930 555-86-07), ВСЕ пользователи этого оператора стабильно получали
  // "занято", и единственным способом починить было руками поменять
  // .env и передеплоить. Теперь номер выбирается из allowed_phones_for_call
  // в ответе zvonok на КАЖДЫЙ запрос — если они уберут из списка
  // заблокированный номер, мы автоматически перестанем его выдавать без
  // единой правки кода. ZVONOK_CONFIRM_NUMBER остаётся как аварийный
  // fallback — на случай, если zvonok временно не пришлёт список (старая
  // версия кампании) или пришлёт его пустым.
  async requestCallbackConfirmation(phone: string): Promise<{ callId: string; number: string }> {
    const publicKey = this.configService.getOrThrow<string>('ZVONOK_PUBLIC_KEY')
    const campaignId = this.configService.getOrThrow<string>('ZVONOK_CONFIRM_CAMPAIGN_ID')
    const fallbackNumber = this.configService.getOrThrow<string>('ZVONOK_CONFIRM_NUMBER')

    const formData = new FormData()

    formData.append('public_key', publicKey)
    formData.append('phone', `+${phone}`)
    formData.append('campaign_id', campaignId)

    let response: globalThis.Response

    try {
      response = await fetch('https://zvonok.com/manager/cabapi_external/api/v1/phones/confirm/', {
        method: 'POST',
        body: formData
      })
    } catch (error) {
      this.logger.error('Zvonok недоступен', error as Error)

      throw new InternalServerErrorException(
        'Не удалось связаться с сервисом подтверждения номера. Попробуйте чуть позже.'
      )
    }

    const data = (await response.json().catch(() => null)) as ZvonokConfirmResponse | null

    if (!response.ok || data?.status !== 'ok' || !data.data?.call_id) {
      this.logger.error(`Zvonok confirm не удался: ${response.status} ${JSON.stringify(data)}`)

      throw new InternalServerErrorException(
        'Не удалось подготовить проверку номера. Проверьте номер телефона и попробуйте снова.'
      )
    }

    const availableNumbers = extractPhoneNumbers(data.data.allowed_phones_for_call)

    // Случайный выбор из доступных номеров — не только страховка от
    // блокировки, но и естественным образом размазывает нагрузку между
    // всеми номерами кампании, вместо того чтобы гонять весь трафик через
    // один и тот же (что как раз и увеличивает шанс, что антиспам-фильтр
    // оператора рано или поздно заблокирует именно его).
    let number: string

    if (availableNumbers.length > 0) {
      number = availableNumbers[Math.floor(Math.random() * availableNumbers.length)]
    } else {
      this.logger.warn(
        'Zvonok не прислал allowed_phones_for_call (или список пуст) — используем ZVONOK_CONFIRM_NUMBER из конфига как fallback'
      )
      number = fallbackNumber
    }

    return { callId: String(data.data.call_id), number: formatPhoneForDisplay(number) }
  }

  // Опрашивается с фронта каждые несколько секунд, пока пользователь не
  // позвонит. callId — тот, что вернул requestCallbackConfirmation.
  async checkCallbackConfirmed(phone: string, callId: string): Promise<boolean> {
    const publicKey = this.configService.getOrThrow<string>('ZVONOK_PUBLIC_KEY')
    const campaignId = this.configService.getOrThrow<string>('ZVONOK_CONFIRM_CAMPAIGN_ID')

    const params = new URLSearchParams({
      public_key: publicKey,
      phone: `+${phone}`,
      campaign_id: campaignId
    })

    let response: globalThis.Response

    try {
      response = await fetch(`https://zvonok.com/manager/cabapi_external/api/v1/phones/calls_by_phone/?${params}`)
    } catch (error) {
      this.logger.error('Zvonok недоступен при проверке статуса', error as Error)

      // Не бросаем исключение наружу — сюда прилетают частые запросы с
      // опроса на фронте, разовый сетевой сбой не должен превращаться в
      // ошибку на экране пользователя, просто считаем, что пока не
      // подтверждено, фронт спросит ещё раз через пару секунд.
      return false
    }

    if (!response.ok) {
      return false
    }

    const data = (await response.json().catch(() => null)) as ZvonokCallStatus[] | null

    if (!Array.isArray(data)) {
      return false
    }

    // dial_status 5 = "Абонент ответил". status "pincode_ok" — это общий
    // статус "успешно подтверждено" у zvonok для верификационных кампаний,
    // используется даже когда пинкода как такового нет (наш случай).
    return data.some(call => String(call.call_id) === callId && call.status === 'pincode_ok')
  }
}
