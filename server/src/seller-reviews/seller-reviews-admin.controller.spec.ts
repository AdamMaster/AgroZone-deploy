import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AuthGuard } from '@/auth/guards/auth.guard'
import { RolesGuard } from '@/auth/guards/roles.guard'
import { UserService } from '@/user/user.service'

import { SellerReviewModerationService } from './seller-review-moderation.service'
import { SellerReviewsAdminController } from './seller-reviews-admin.controller'

const REVIEW_ID = '1798edb5-4e5a-4a6b-9c7d-8e9f0a1b2c3d'

// Настоящие AuthGuard/RolesGuard и ValidationPipe, подменены сервис и поиск
// пользователя: проверяем, что очередь и решения доступны только админу.
describe('Модерация отзывов (HTTP)', () => {
  let app: INestApplication
  let moderationService: { findQueue: jest.Mock; moderate: jest.Mock }
  let signedIn: { id: string; role: 'ADMIN' | 'USER' } | undefined

  beforeEach(async () => {
    signedIn = undefined
    moderationService = {
      findQueue: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
      moderate: jest.fn().mockResolvedValue({ id: REVIEW_ID, status: 'HIDDEN' })
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [SellerReviewsAdminController],
      providers: [
        AuthGuard,
        RolesGuard,
        { provide: SellerReviewModerationService, useValue: moderationService },
        {
          provide: UserService,
          useValue: { findById: jest.fn(async () => (signedIn ? { ...signedIn, deletedAt: null } : null)) }
        }
      ]
    }).compile()

    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    app.use((req: { session?: { userId: string } }, _res: unknown, next: () => void) => {
      if (signedIn) req.session = { userId: signedIn.id }
      next()
    })
    await app.init()
  })

  afterEach(() => app.close())

  it.each([
    ['GET', '/admin/seller-reviews'],
    ['PATCH', `/admin/seller-reviews/${REVIEW_ID}/moderation`]
  ])('%s %s — гостю 401', async (method, path) => {
    const response = await request(app.getHttpServer())[method.toLowerCase() as 'get'](path).send({ decision: 'HIDE' })

    expect(response.status).toBe(401)
  })

  it.each([
    ['GET', '/admin/seller-reviews'],
    ['PATCH', `/admin/seller-reviews/${REVIEW_ID}/moderation`]
  ])('%s %s — обычному пользователю 403', async (method, path) => {
    signedIn = { id: 'user', role: 'USER' }

    const response = await request(app.getHttpServer())[method.toLowerCase() as 'get'](path).send({ decision: 'HIDE' })

    expect(response.status).toBe(403)
    expect(moderationService.findQueue).not.toHaveBeenCalled()
    expect(moderationService.moderate).not.toHaveBeenCalled()
  })

  it('админ получает очередь с пагинацией', async () => {
    signedIn = { id: 'admin', role: 'ADMIN' }

    const response = await request(app.getHttpServer()).get('/admin/seller-reviews?page=2&limit=10')

    expect(response.status).toBe(200)
    expect(moderationService.findQueue).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 10 }))
  })

  it('админ принимает решение: id модератора берётся из сессии', async () => {
    signedIn = { id: 'admin', role: 'ADMIN' }

    const response = await request(app.getHttpServer())
      .patch(`/admin/seller-reviews/${REVIEW_ID}/moderation`)
      .send({ decision: 'HIDE' })

    expect(response.status).toBe(200)
    expect(moderationService.moderate).toHaveBeenCalledWith(REVIEW_ID, 'admin', { decision: 'HIDE' })
  })

  it.each([
    ['нет решения', {}],
    ['неизвестное решение', { decision: 'DELETE' }],
    ['лишнее поле', { decision: 'HIDE', status: 'PUBLISHED' }]
  ])('решение с некорректным телом (%s) — 400', async (_name, body) => {
    signedIn = { id: 'admin', role: 'ADMIN' }

    const response = await request(app.getHttpServer())
      .patch(`/admin/seller-reviews/${REVIEW_ID}/moderation`)
      .send(body)

    expect(response.status).toBe(400)
    expect(moderationService.moderate).not.toHaveBeenCalled()
  })

  it('размер страницы выше максимума — 400', async () => {
    signedIn = { id: 'admin', role: 'ADMIN' }

    expect((await request(app.getHttpServer()).get('/admin/seller-reviews?limit=500')).status).toBe(400)
  })
})
