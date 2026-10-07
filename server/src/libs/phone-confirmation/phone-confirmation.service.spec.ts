import { BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { PhoneConfirmationService } from './phone-confirmation.service'

describe('PhoneConfirmationService', () => {
  let config: Record<string, string | undefined>
  let smsRu: { requestCallbackConfirmation: jest.Mock; checkCallbackConfirmed: jest.Mock }
  let zvonok: { requestCallbackConfirmation: jest.Mock; checkCallbackConfirmed: jest.Mock }
  let service: PhoneConfirmationService

  beforeEach(() => {
    config = { SMSRU_API_ID: 'key', ZVONOK_PUBLIC_KEY: 'zv-key' }
    smsRu = { requestCallbackConfirmation: jest.fn(), checkCallbackConfirmed: jest.fn() }
    zvonok = { requestCallbackConfirmation: jest.fn(), checkCallbackConfirmed: jest.fn() }

    service = new PhoneConfirmationService({ get: (key: string) => config[key] } as any, smsRu as any, zvonok as any)
  })

  describe('выбор основного провайдера', () => {
    it('sms.ru, если задан SMSRU_API_ID', () => {
      expect(service.getPrimaryProvider()).toBe('smsru')
    })

    it('«Звонок», пока SMSRU_API_ID не задан — деплой кода ничего не меняет', () => {
      config.SMSRU_API_ID = undefined

      expect(service.getPrimaryProvider()).toBe('zvonok')
    })

    it('PHONE_CONFIRM_PROVIDER важнее наличия ключа', () => {
      config.PHONE_CONFIRM_PROVIDER = 'zvonok'

      expect(service.getPrimaryProvider()).toBe('zvonok')
    })

    it('мусор в PHONE_CONFIRM_PROVIDER игнорируется', () => {
      config.PHONE_CONFIRM_PROVIDER = 'twilio'

      expect(service.getPrimaryProvider()).toBe('smsru')
    })
  })

  describe('requestCallbackConfirmation', () => {
    it('sms.ru: помечает токен префиксом sr: и пробрасывает IP', async () => {
      smsRu.requestCallbackConfirmation.mockResolvedValue({ callId: '201737-542', number: '+7 (800) 500-8275' })

      const result = await service.requestCallbackConfirmation('375291234567', '178.120.10.5')

      expect(result).toEqual({ callId: 'sr:201737-542', number: '+7 (800) 500-8275' })
      expect(smsRu.requestCallbackConfirmation).toHaveBeenCalledWith('375291234567', '178.120.10.5')
      expect(zvonok.requestCallbackConfirmation).not.toHaveBeenCalled()
    })

    it('«Звонок» как основной: префикс zv:, sms.ru не трогаем', async () => {
      config.PHONE_CONFIRM_PROVIDER = 'zvonok'
      zvonok.requestCallbackConfirmation.mockResolvedValue({ callId: '123', number: '+7 930 555-86-07' })

      const result = await service.requestCallbackConfirmation('79991234567')

      expect(result).toEqual({ callId: 'zv:123', number: '+7 930 555-86-07' })
      expect(smsRu.requestCallbackConfirmation).not.toHaveBeenCalled()
    })

    it('сбой sms.ru на российском номере — резерв через «Звонок»', async () => {
      smsRu.requestCallbackConfirmation.mockRejectedValue(new InternalServerErrorException('down'))
      zvonok.requestCallbackConfirmation.mockResolvedValue({ callId: '123', number: '+7 930 555-86-07' })

      const result = await service.requestCallbackConfirmation('79991234567')

      expect(result.callId).toBe('zv:123')
    })

    it('сбой sms.ru на иностранном номере — резерва нет, ошибка уходит наружу', async () => {
      smsRu.requestCallbackConfirmation.mockRejectedValue(new InternalServerErrorException('down'))

      await expect(service.requestCallbackConfirmation('375291234567')).rejects.toBeInstanceOf(
        InternalServerErrorException
      )
      expect(zvonok.requestCallbackConfirmation).not.toHaveBeenCalled()
    })

    it('«неверный номер» (400) резервом не лечится', async () => {
      smsRu.requestCallbackConfirmation.mockRejectedValue(new BadRequestException('bad phone'))

      await expect(service.requestCallbackConfirmation('79991234567')).rejects.toBeInstanceOf(BadRequestException)
      expect(zvonok.requestCallbackConfirmation).not.toHaveBeenCalled()
    })

    it('без настроенного «Звонка» резерва нет', async () => {
      config.ZVONOK_PUBLIC_KEY = undefined
      smsRu.requestCallbackConfirmation.mockRejectedValue(new InternalServerErrorException('down'))

      await expect(service.requestCallbackConfirmation('79991234567')).rejects.toBeInstanceOf(
        InternalServerErrorException
      )
    })
  })

  describe('checkCallbackConfirmed', () => {
    it('sr: — проверяет у sms.ru по id без префикса', async () => {
      smsRu.checkCallbackConfirmed.mockResolvedValue(true)

      await expect(service.checkCallbackConfirmed('79991234567', 'sr:201737-542')).resolves.toBe(true)
      expect(smsRu.checkCallbackConfirmed).toHaveBeenCalledWith('201737-542')
    })

    it('zv: — проверяет у «Звонка» по id без префикса', async () => {
      zvonok.checkCallbackConfirmed.mockResolvedValue(true)

      await expect(service.checkCallbackConfirmed('79991234567', 'zv:123')).resolves.toBe(true)
      expect(zvonok.checkCallbackConfirmed).toHaveBeenCalledWith('79991234567', '123')
    })

    it('токен без префикса (выдан до sms.ru) — это «Звонок»', async () => {
      zvonok.checkCallbackConfirmed.mockResolvedValue(false)

      await service.checkCallbackConfirmed('79991234567', '987654')

      expect(zvonok.checkCallbackConfirmed).toHaveBeenCalledWith('79991234567', '987654')
      expect(smsRu.checkCallbackConfirmed).not.toHaveBeenCalled()
    })
  })
})
