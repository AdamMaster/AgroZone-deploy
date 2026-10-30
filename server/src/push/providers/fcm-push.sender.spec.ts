import type { ConfigService } from '@nestjs/config'
import { createPublicKey, createVerify, generateKeyPairSync } from 'node:crypto'

import { FcmPushSender } from './fcm-push.sender'

const payload = { title: 'Иван', body: 'Привет', link: 'agrozone://chat/c1', data: { conversationId: 'c1' } }

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' }
})

const encodeAccount = (account: object) => Buffer.from(JSON.stringify(account)).toString('base64')

const account = {
  project_id: 'agrozone-test',
  client_email: 'push@agrozone-test.iam.gserviceaccount.com',
  private_key: privateKey
}

describe('FcmPushSender', () => {
  let config: Record<string, string | undefined>
  let sender: FcmPushSender
  let fetchMock: jest.Mock

  const jsonResponse = (status: number, body: unknown = {}) => ({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body))
  })

  // Первый запрос — обмен JWT на токен Google, остальные — отправка в FCM.
  const mockFcm = (status: number, body: unknown = {}) => {
    fetchMock.mockImplementation((url: string) =>
      Promise.resolve(
        url.startsWith('https://oauth2.googleapis.com')
          ? jsonResponse(200, { access_token: 'google-token', expires_in: 3600 })
          : jsonResponse(status, body)
      )
    )
  }

  const fcmCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('fcm.googleapis.com'))
  const oauthCalls = () => fetchMock.mock.calls.filter(([url]) => String(url).includes('oauth2.googleapis.com'))

  beforeEach(() => {
    config = { FCM_SERVICE_ACCOUNT_BASE64: encodeAccount(account) }
    sender = new FcmPushSender({ get: (key: string) => config[key] } as unknown as ConfigService)
    fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch
    mockFcm(200)
  })

  it('отправляет data-сообщение с высоким приоритетом и токеном Google', async () => {
    await expect(sender.send('device-token', payload)).resolves.toBe('sent')

    const [url, init] = fcmCalls()[0] as [string, RequestInit]

    expect(url).toBe('https://fcm.googleapis.com/v1/projects/agrozone-test/messages:send')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer google-token')
    expect(JSON.parse(init.body as string)).toEqual({
      message: {
        token: 'device-token',
        data: { conversationId: 'c1', title: 'Иван', body: 'Привет', link: 'agrozone://chat/c1' },
        android: { priority: 'HIGH', ttl: '86400s' }
      }
    })
  })

  it('подписывает JWT ключом сервисного аккаунта (RS256)', async () => {
    await sender.send('t', payload)

    const params = (oauthCalls()[0][1] as RequestInit).body as URLSearchParams
    const [header, claims, signature] = params.get('assertion')!.split('.')

    expect(params.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer')
    expect(JSON.parse(Buffer.from(header, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' })

    const decoded = JSON.parse(Buffer.from(claims, 'base64url').toString())

    expect(decoded).toMatchObject({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token'
    })
    expect(decoded.exp - decoded.iat).toBe(3600)
    expect(
      createVerify('RSA-SHA256')
        .update(`${header}.${claims}`)
        .verify(createPublicKey(publicKey), signature, 'base64url')
    ).toBe(true)
  })

  it('токен Google берётся один раз на серию отправок, в том числе параллельных', async () => {
    await Promise.all([sender.send('a', payload), sender.send('b', payload), sender.send('c', payload)])
    await sender.send('d', payload)

    expect(oauthCalls()).toHaveLength(1)
    expect(fcmCalls()).toHaveLength(4)
  })

  it('без настроек или с неверным ключом ничего не отправляет', async () => {
    config = {}
    await expect(sender.send('t', payload)).resolves.toBe('skipped')

    config = { FCM_SERVICE_ACCOUNT_BASE64: 'not-base64-json' }
    sender = new FcmPushSender({ get: (key: string) => config[key] } as unknown as ConfigService)
    await expect(sender.send('t', payload)).resolves.toBe('skipped')

    config = { FCM_SERVICE_ACCOUNT_BASE64: encodeAccount({ project_id: 'x' }) }
    sender = new FcmPushSender({ get: (key: string) => config[key] } as unknown as ConfigService)
    await expect(sender.send('t', payload)).resolves.toBe('skipped')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('«токен не найден» и «токен кривой» — устройство больше не действует', async () => {
    mockFcm(404, { error: { code: 404, status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } })
    await expect(sender.send('t', payload)).resolves.toBe('invalid-token')

    mockFcm(400, { error: { code: 400, status: 'INVALID_ARGUMENT', message: 'The registration token is not valid' } })
    await expect(sender.send('t', payload)).resolves.toBe('invalid-token')
  })

  it('другие ошибки токен не портят', async () => {
    mockFcm(400, { error: { code: 400, status: 'INVALID_ARGUMENT', message: 'Invalid JSON payload' } })
    await expect(sender.send('t', payload)).resolves.toBe('failed')

    mockFcm(500, { error: { status: 'INTERNAL' } })
    await expect(sender.send('t', payload)).resolves.toBe('failed')
  })

  it('после 401 следующая отправка берёт новый токен Google', async () => {
    mockFcm(401, { error: { status: 'UNAUTHENTICATED' } })
    await expect(sender.send('t', payload)).resolves.toBe('failed')

    mockFcm(200)
    await expect(sender.send('t', payload)).resolves.toBe('sent')

    expect(oauthCalls()).toHaveLength(2)
  })

  it('сбой сети не выбрасывается наружу', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    await expect(sender.send('t', payload)).resolves.toBe('failed')
  })
})
