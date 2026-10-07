import { BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SmsRuService } from './smsru.service'

const jsonResponse = (body: unknown, ok = true, status = 200) =>
  ({ ok, status, json: () => Promise.resolve(body) }) as unknown as Response

describe('SmsRuService', () => {
  let service: SmsRuService
  let fetchMock: jest.Mock

  beforeEach(() => {
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    const configService = { getOrThrow: jest.fn().mockReturnValue('TEST-API-ID') } as unknown as ConfigService

    service = new SmsRuService(configService)
  })

  describe('requestCallbackConfirmation', () => {
    const okBody = {
      status: 'OK',
      status_code: 100,
      check_id: '201737-542',
      call_phone: '78005008275',
      call_phone_pretty: '+7 (800) 500-8275'
    }

    it('возвращает check_id и красивый номер для звонка', async () => {
      fetchMock.mockResolvedValue(jsonResponse(okBody))

      await expect(service.requestCallbackConfirmation('79991234567')).resolves.toEqual({
        callId: '201737-542',
        number: '+7 (800) 500-8275'
      })

      const url = new URL(fetchMock.mock.calls[0][0] as string)

      expect(url.origin + url.pathname).toBe('https://sms.ru/callcheck/add')
      expect(url.searchParams.get('phone')).toBe('79991234567')
      expect(url.searchParams.get('api_id')).toBe('TEST-API-ID')
      expect(url.searchParams.get('json')).toBe('1')
    })

    it('передаёт публичный IP пользователя', async () => {
      fetchMock.mockResolvedValue(jsonResponse(okBody))

      await service.requestCallbackConfirmation('375291234567', '178.120.10.5')

      const url = new URL(fetchMock.mock.calls[0][0] as string)

      expect(url.searchParams.get('ip')).toBe('178.120.10.5')
    })

    it('убирает ::ffff: у IPv4-mapped адреса', async () => {
      fetchMock.mockResolvedValue(jsonResponse(okBody))

      await service.requestCallbackConfirmation('79991234567', '::ffff:178.120.10.5')

      expect(new URL(fetchMock.mock.calls[0][0] as string).searchParams.get('ip')).toBe('178.120.10.5')
    })

    it.each(['10.0.0.5', '172.18.0.3', '192.168.1.10', '127.0.0.1', '::1', 'unknown', ''])(
      'не передаёт IP %p: он ничего не говорит о местонахождении пользователя',
      async ip => {
        fetchMock.mockResolvedValue(jsonResponse(okBody))

        await service.requestCallbackConfirmation('79991234567', ip)

        expect(new URL(fetchMock.mock.calls[0][0] as string).searchParams.has('ip')).toBe(false)
      }
    )

    it('код 202 — неверный номер: 400 для пользователя, а не 500', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'ERROR', status_code: 202 }))

      await expect(service.requestCallbackConfirmation('1')).rejects.toBeInstanceOf(BadRequestException)
    })

    it('любой другой отказ sms.ru — 500 и без api_id в тексте ошибки', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'ERROR', status_code: 200 }))

      const error = await service.requestCallbackConfirmation('79991234567').catch(e => e)

      expect(error).toBeInstanceOf(InternalServerErrorException)
      expect(JSON.stringify(error.getResponse())).not.toContain('TEST-API-ID')
    })

    it('сетевой сбой — 500 с понятным сообщением', async () => {
      fetchMock.mockRejectedValue(new Error('fetch failed'))

      await expect(service.requestCallbackConfirmation('79991234567')).rejects.toBeInstanceOf(
        InternalServerErrorException
      )
    })
  })

  describe('checkCallbackConfirmed', () => {
    it('true только при check_status 401', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'OK', status_code: 100, check_status: '401' }))

      await expect(service.checkCallbackConfirmed('201737-542')).resolves.toBe(true)

      const url = new URL(fetchMock.mock.calls[0][0] as string)

      expect(url.origin + url.pathname).toBe('https://sms.ru/callcheck/status')
      expect(url.searchParams.get('check_id')).toBe('201737-542')
    })

    it.each(['400', '402'])('false при check_status %s (ждём звонок / время вышло)', async checkStatus => {
      fetchMock.mockResolvedValue(jsonResponse({ status: 'OK', status_code: 100, check_status: checkStatus }))

      await expect(service.checkCallbackConfirmed('x')).resolves.toBe(false)
    })

    it('сбой сети или не-200 не превращается в ошибку — просто false', async () => {
      fetchMock.mockRejectedValueOnce(new Error('fetch failed'))
      await expect(service.checkCallbackConfirmed('x')).resolves.toBe(false)

      fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 500))
      await expect(service.checkCallbackConfirmed('x')).resolves.toBe(false)
    })
  })
})
