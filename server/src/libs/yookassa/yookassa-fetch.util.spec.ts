import { ServiceUnavailableException } from '@nestjs/common'

import { yookassaFetch } from './yookassa-fetch.util'

describe('yookassaFetch', () => {
  afterEach(() => jest.restoreAllMocks())

  it('обращается к API ЮKassa и передаёт сигнал с пределом ожидания', async () => {
    const response = { ok: true } as Response
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(response)

    await expect(yookassaFetch('/payments/pay-1', { method: 'GET' })).resolves.toBe(response)

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.yookassa.ru/v3/payments/pay-1',
      expect.objectContaining({ method: 'GET', signal: expect.any(AbortSignal) })
    )
  })

  it('ответ с ошибкой возвращает как есть, разбирает его вызывающий код', async () => {
    const response = { ok: false, status: 500 } as Response
    jest.spyOn(global, 'fetch').mockResolvedValue(response)

    await expect(yookassaFetch('/payments')).resolves.toBe(response)
  })

  it.each([
    ['таймаут', new DOMException('The operation timed out', 'TimeoutError')],
    ['обрыв сети', new TypeError('fetch failed')]
  ])('%s превращается в 503', async (_name, error) => {
    jest.spyOn(global, 'fetch').mockRejectedValue(error)

    await expect(yookassaFetch('/payments')).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
