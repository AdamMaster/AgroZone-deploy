import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'

import { BaseOAuthService } from './base-oauth.service'

const jsonResponse = (body: unknown, ok = true) => ({ ok, json: async () => body }) as unknown as Response

describe('BaseOAuthService.findUserByCode', () => {
  let service: BaseOAuthService

  beforeEach(() => {
    service = new BaseOAuthService({
      name: 'yandex',
      authorize_url: 'https://oauth.test/authorize',
      access_url: 'https://oauth.test/token',
      profile_url: 'https://oauth.test/profile',
      scopes: [],
      client_id: 'id',
      client_secret: 'secret'
    })
    service.baseUrl = 'https://agro.test'
  })

  afterEach(() => jest.restoreAllMocks())

  it('оба запроса к провайдеру идут с пределом ожидания', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ access_token: 'token' }))
      .mockResolvedValueOnce(jsonResponse({ id: '1' }))

    await service.findUserByCode('code')

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    for (const [, init] of fetchSpy.mock.calls) {
      expect(init?.signal).toBeInstanceOf(AbortSignal)
    }
  })

  it('профиль Яндекса запрашивается с заголовком OAuth', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ access_token: 'token' }))
      .mockResolvedValueOnce(jsonResponse({ id: '1' }))

    await service.findUserByCode('code')

    expect(fetchSpy.mock.calls[1][1]?.headers).toEqual({ Authorization: 'OAuth token' })
  })

  it.each([
    ['таймаут', new DOMException('The operation timed out', 'TimeoutError')],
    ['обрыв сети', new TypeError('fetch failed')]
  ])('%s при обмене кода превращается в 503, а не в 500', async (_name, error) => {
    jest.spyOn(global, 'fetch').mockRejectedValue(error)

    await expect(service.findUserByCode('code')).rejects.toBeInstanceOf(ServiceUnavailableException)
  })

  it('таймаут при запросе профиля тоже даёт 503', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ access_token: 'token' }))
      .mockRejectedValueOnce(new DOMException('The operation timed out', 'TimeoutError'))

    await expect(service.findUserByCode('code')).rejects.toBeInstanceOf(ServiceUnavailableException)
  })

  it('ответ провайдера с ошибкой по-прежнему разбирается как раньше', async () => {
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ access_token: 'token' }))
      .mockResolvedValueOnce(jsonResponse({}, false))

    await expect(service.findUserByCode('code')).rejects.toBeInstanceOf(UnauthorizedException)
  })
})
