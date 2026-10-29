import type { ConfigService } from '@nestjs/config'

import { RuStorePushSender } from './rustore-push.sender'

const payload = { title: 'Иван', body: 'Привет', link: 'agrozone://chat/c1', data: { conversationId: 'c1' } }

describe('RuStorePushSender', () => {
  let config: Record<string, string | undefined>
  let sender: RuStorePushSender
  let fetchMock: jest.Mock

  const respond = (status: number, body: unknown = {}) =>
    fetchMock.mockResolvedValue({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(body) })

  beforeEach(() => {
    config = { RUSTORE_PUSH_PROJECT_ID: 'proj', RUSTORE_PUSH_SERVICE_TOKEN: 'secret' }
    sender = new RuStorePushSender({ get: (key: string) => config[key] } as unknown as ConfigService)
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    respond(200)
  })

  it('отправляет запрос в RuStore с сервисным токеном, ссылкой и заголовком', async () => {
    await expect(sender.send('device-token', payload)).resolves.toBe('sent')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]

    expect(url).toBe('https://vkpns.rustore.ru/v1/projects/proj/messages:send')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret')
    expect(JSON.parse(init.body as string)).toEqual({
      message: {
        token: 'device-token',
        data: { conversationId: 'c1' },
        android: {
          notification: { title: 'Иван', body: 'Привет', click_action: 'agrozone://chat/c1', click_action_type: 1 }
        }
      }
    })
  })

  it('без настроек ничего не отправляет', async () => {
    config = {}

    await expect(sender.send('t', payload)).resolves.toBe('skipped')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('«токен не найден» и «токен кривой» — устройство больше не действует', async () => {
    respond(404, { error: { code: 404, status: 'NOT_FOUND', message: 'token expired' } })
    await expect(sender.send('t', payload)).resolves.toBe('invalid-token')

    respond(400, {
      error: {
        code: 400,
        status: 'INVALID_ARGUMENT',
        message: 'The registration token is not a valid FCM registration token'
      }
    })
    await expect(sender.send('t', payload)).resolves.toBe('invalid-token')
  })

  it('прочие ошибки токен не портят: неверный сервисный токен, лимит, ошибка в теле', async () => {
    for (const [code, status, message] of [
      [403, 'PERMISSION_DENIED', 'bad service key'],
      [429, 'TOO_MANY_REQUESTS', 'slow down'],
      [400, 'INVALID_ARGUMENT', 'title is required'],
      [500, 'INTERNAL', 'oops']
    ] as const) {
      respond(code, { error: { code, status, message } })

      await expect(sender.send('t', payload)).resolves.toBe('failed')
    }
  })

  it('сбой сети — «не удалось», без исключения', async () => {
    fetchMock.mockRejectedValue(new Error('timeout'))

    await expect(sender.send('t', payload)).resolves.toBe('failed')
  })
})
