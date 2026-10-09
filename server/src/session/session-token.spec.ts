import express from 'express'
import session from 'express-session'
import request from 'supertest'

import {
  AUTH_TRANSPORT_HEADER,
  createSessionTokenMiddleware,
  extractBearerSessionToken,
  isTokenTransportRequest,
  signSessionId
} from './session-token'

const SECRET = 'test-session-secret'
const SESSION_NAME = 'session'

// Настоящий express-session (как в main.ts, только с хранилищем в памяти):
// проверяем не «похоже ли на правду», а что ключ из signSessionId реально
// принимается express-session и указывает на ту же сессию.
function createApp() {
  const app = express()

  app.use(createSessionTokenMiddleware(SESSION_NAME))
  app.use(session({ secret: SECRET, name: SESSION_NAME, resave: false, saveUninitialized: false }))

  app.post('/login', (req, res) => {
    req.session.userId = 'user-1'
    req.session.save(() => res.json({ sessionId: req.sessionID, token: signSessionId(req.sessionID, SECRET) }))
  })

  app.get('/me', (req, res) => {
    res.json({ sessionId: req.sessionID, userId: req.session.userId ?? null })
  })

  return app
}

describe('session-token', () => {
  it('signSessionId даёт ровно то значение, которое express-session кладёт в cookie', async () => {
    const response = await request(createApp()).post('/login')
    const setCookie = response.headers['set-cookie'] as unknown as string[]
    const cookieValue = decodeURIComponent(setCookie[0].split(';')[0].split('=')[1])

    expect(cookieValue).toBe(response.body.token)
  })

  it('ключ из Authorization открывает ту же сессию, что и cookie', async () => {
    const app = createApp()
    const login = await request(app).post('/login')

    const me = await request(app).get('/me').set('Authorization', `Bearer ${login.body.token}`)

    expect(me.body).toEqual({ sessionId: login.body.sessionId, userId: 'user-1' })
  })

  it('ключ с чужой подписью не принимается — запрос анонимный', async () => {
    const app = createApp()
    const login = await request(app).post('/login')
    const forged = signSessionId(login.body.sessionId, 'another-secret')

    const me = await request(app).get('/me').set('Authorization', `Bearer ${forged}`)

    expect(me.body.userId).toBeNull()
  })

  it('cookie сессии главнее заголовка Authorization (запрос сайта)', async () => {
    const app = createApp()
    const first = await request(app).post('/login')
    const second = await request(app).post('/login')
    const cookie = `${SESSION_NAME}=${encodeURIComponent(first.body.token)}`

    const me = await request(app).get('/me').set('Cookie', cookie).set('Authorization', `Bearer ${second.body.token}`)

    expect(me.body.sessionId).toBe(first.body.sessionId)
  })

  describe('extractBearerSessionToken', () => {
    it('принимает ключ в формате express-session', () => {
      const token = signSessionId('a'.repeat(32), SECRET)

      expect(extractBearerSessionToken(`Bearer ${token}`)).toBe(token)
    })

    it.each([
      [undefined],
      ['Basic dXNlcjpwYXNz'],
      ['Bearer '],
      ['Bearer not-a-session-token'],
      // Попытка дописать в Cookie свою cookie через «;».
      [`Bearer s:${'a'.repeat(32)}.sig; admin=1`]
    ])('отклоняет %s', header => {
      expect(extractBearerSessionToken(header)).toBeNull()
    })
  })

  it('isTokenTransportRequest смотрит на X-Auth-Transport: token', () => {
    expect(isTokenTransportRequest({ headers: { [AUTH_TRANSPORT_HEADER]: 'token' } } as any)).toBe(true)
    expect(isTokenTransportRequest({ headers: {} } as any)).toBe(false)
  })
})
