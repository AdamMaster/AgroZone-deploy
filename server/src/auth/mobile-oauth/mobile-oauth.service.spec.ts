import { BadRequestException } from '@nestjs/common'

import {
  MobileOAuthService,
  appendQuery,
  createCodeChallenge,
  isAllowedMobileRedirectUri
} from './mobile-oauth.service'

// Redis в памяти: set с JSON, как RedisService.set, и атомарный GETDEL.
function createRedisMock() {
  const store = new Map<string, string>()

  return {
    store,
    set: jest.fn((key: string, value: unknown) => {
      store.set(key, JSON.stringify(value))
      return Promise.resolve()
    }),
    getClient: () => ({
      getDel: jest.fn((key: string) => {
        const value = store.get(key) ?? null
        store.delete(key)
        return Promise.resolve(value)
      })
    })
  }
}

const VERIFIER = 'v'.repeat(43)
const CHALLENGE = createCodeChallenge(VERIFIER)

describe('MobileOAuthService', () => {
  let redis: ReturnType<typeof createRedisMock>
  let service: MobileOAuthService

  beforeEach(() => {
    redis = createRedisMock()
    service = new MobileOAuthService(redis as any)
  })

  describe('адрес возврата в приложение', () => {
    it.each(['agrozone://oauth', 'exp://192.168.1.5:8081/--/oauth', 'exps://u.expo.dev/--/oauth'])(
      'разрешает %s',
      uri => expect(isAllowedMobileRedirectUri(uri)).toBe(true)
    )

    it.each(['https://evil.example.com/steal', 'javascript:alert(1)', 'not a url', `agrozone://${'a'.repeat(600)}`])(
      'запрещает %s',
      uri => expect(isAllowedMobileRedirectUri(uri)).toBe(false)
    )
  })

  it('appendQuery дописывает параметры и к адресу без query, и к адресу с query', () => {
    expect(appendQuery('agrozone://oauth', { ticket: 'abc' })).toBe('agrozone://oauth?ticket=abc')
    expect(appendQuery('agrozone://oauth?x=1', { error: 'Вход отменён.' })).toBe(
      'agrozone://oauth?x=1&error=%D0%92%D1%85%D0%BE%D0%B4+%D0%BE%D1%82%D0%BC%D0%B5%D0%BD%D1%91%D0%BD.'
    )
  })

  describe('createAuthRequest / consumeAuthRequest', () => {
    it('state одноразовый', async () => {
      const state = await service.createAuthRequest('agrozone://oauth', CHALLENGE)

      expect(await service.consumeAuthRequest(state)).toEqual({
        redirectUri: 'agrozone://oauth',
        codeChallenge: CHALLENGE
      })
      expect(await service.consumeAuthRequest(state)).toBeNull()
    })

    it('неизвестный или пустой state — не запрос приложения', async () => {
      expect(await service.consumeAuthRequest('unknown')).toBeNull()
      expect(await service.consumeAuthRequest(undefined)).toBeNull()
    })

    it('отклоняет чужой адрес возврата', async () => {
      await expect(service.createAuthRequest('https://evil.example.com', CHALLENGE)).rejects.toBeInstanceOf(
        BadRequestException
      )
    })

    it('отклоняет codeChallenge не в формате S256', async () => {
      await expect(service.createAuthRequest('agrozone://oauth', 'plain-verifier')).rejects.toBeInstanceOf(
        BadRequestException
      )
    })
  })

  describe('issueTicket / redeemTicket', () => {
    it('с верным секретом отдаёт пользователя, повторно ticket не работает', async () => {
      const ticket = await service.issueTicket({ userId: 'user-1', isNewUser: true, codeChallenge: CHALLENGE })

      await expect(service.redeemTicket(ticket, VERIFIER)).resolves.toEqual({ userId: 'user-1', isNewUser: true })
      await expect(service.redeemTicket(ticket, VERIFIER)).rejects.toBeInstanceOf(BadRequestException)
    })

    it('с чужим секретом отказывает и сжигает ticket', async () => {
      const ticket = await service.issueTicket({ userId: 'user-1', isNewUser: false, codeChallenge: CHALLENGE })

      await expect(service.redeemTicket(ticket, 'w'.repeat(43))).rejects.toBeInstanceOf(BadRequestException)
      await expect(service.redeemTicket(ticket, VERIFIER)).rejects.toBeInstanceOf(BadRequestException)
    })

    it('ticket хранится с коротким сроком жизни', async () => {
      await service.issueTicket({ userId: 'user-1', isNewUser: false, codeChallenge: CHALLENGE })

      expect(redis.set).toHaveBeenCalledWith(expect.stringContaining('ticket'), expect.anything(), 60)
    })
  })
})
