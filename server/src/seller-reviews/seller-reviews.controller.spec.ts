import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AuthGuard } from '@/auth/guards/auth.guard'
import { SiteSettingsService } from '@/site-settings/site-settings.service'
import { UserService } from '@/user/user.service'

import { SellerRatingsEnabledGuard } from './guards/seller-ratings-enabled.guard'
import { SellerReviewReportsService } from './seller-review-reports.service'
import { SellerReviewsController, UserReviewsController } from './seller-reviews.controller'
import { SellerReviewsService } from './seller-reviews.service'

const SELLER_ID = '3fa26bd9-a473-415a-8f2e-0b1c2d3e4f50'
const REVIEW_ID = '1798edb5-4e5a-4a6b-9c7d-8e9f0a1b2c3d'

// Настоящие гарды и ValidationPipe как в main.ts, подменён только сервис:
// проверяем то, что видно снаружи — какие ручки закрыты флагом и кому
// нужна авторизация.
describe('Контроллеры отзывов о продавцах (HTTP)', () => {
  let app: INestApplication
  let sellerReviewsService: Record<string, jest.Mock>
  let reportsService: { report: jest.Mock }
  let siteSettingsService: { getFlags: jest.Mock }
  // Авторизация имитируется заголовком: настоящая сессия в тесте не нужна.
  let signedInUserId: string | undefined

  beforeEach(async () => {
    signedInUserId = undefined
    sellerReviewsService = {
      findForSeller: jest.fn().mockResolvedValue({ items: [], nextCursor: null, rating: { average: null, count: 0 } }),
      findMine: jest.fn().mockResolvedValue({ review: null, eligibility: { canReview: false } }),
      create: jest.fn().mockResolvedValue({ id: REVIEW_ID }),
      update: jest.fn().mockResolvedValue({ id: REVIEW_ID }),
      remove: jest.fn().mockResolvedValue(undefined),
      reply: jest.fn().mockResolvedValue({ id: REVIEW_ID })
    }
    reportsService = { report: jest.fn().mockResolvedValue(undefined) }
    siteSettingsService = { getFlags: jest.fn().mockResolvedValue({ sellerRatings: true }) }

    const moduleRef = await Test.createTestingModule({
      controllers: [UserReviewsController, SellerReviewsController],
      providers: [
        SellerRatingsEnabledGuard,
        AuthGuard,
        { provide: SellerReviewsService, useValue: sellerReviewsService },
        { provide: SellerReviewReportsService, useValue: reportsService },
        { provide: SiteSettingsService, useValue: siteSettingsService },
        { provide: UserService, useValue: { findById: jest.fn().mockResolvedValue({ id: 'user', deletedAt: null }) } }
      ]
    }).compile()

    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
    app.use((req: { session?: { userId: string } }, _res: unknown, next: () => void) => {
      if (signedInUserId) req.session = { userId: signedInUserId }
      next()
    })
    await app.init()
  })

  afterEach(() => app.close())

  describe('рейтинги выключены в админке', () => {
    beforeEach(() => siteSettingsService.getFlags.mockResolvedValue({ sellerRatings: false }))

    it.each([
      ['GET', `/users/${SELLER_ID}/reviews`],
      ['GET', `/users/${SELLER_ID}/reviews/mine`],
      ['POST', `/users/${SELLER_ID}/reviews`],
      ['PATCH', `/seller-reviews/${REVIEW_ID}`],
      ['DELETE', `/seller-reviews/${REVIEW_ID}`],
      ['PUT', `/seller-reviews/${REVIEW_ID}/reply`],
      ['POST', `/seller-reviews/${REVIEW_ID}/reports`]
    ])('%s %s — 404 даже для гостя, до проверки авторизации', async (method, path) => {
      const response = await request(app.getHttpServer())[method.toLowerCase() as 'get'](path).send({ rating: 5 })

      expect(response.status).toBe(404)
      expect(Object.values(sellerReviewsService).every(fn => fn.mock.calls.length === 0)).toBe(true)
    })
  })

  describe('рейтинги включены', () => {
    it('список отзывов открыт гостям', async () => {
      const response = await request(app.getHttpServer()).get(`/users/${SELLER_ID}/reviews?limit=5`)

      expect(response.status).toBe(200)
      expect(sellerReviewsService.findForSeller).toHaveBeenCalledWith(SELLER_ID, expect.objectContaining({ limit: 5 }))
    })

    it.each([
      ['GET', `/users/${SELLER_ID}/reviews/mine`, undefined],
      ['POST', `/users/${SELLER_ID}/reviews`, { rating: 5 }],
      ['PATCH', `/seller-reviews/${REVIEW_ID}`, { rating: 4 }],
      ['DELETE', `/seller-reviews/${REVIEW_ID}`, undefined],
      ['PUT', `/seller-reviews/${REVIEW_ID}/reply`, { text: 'Спасибо' }],
      ['POST', `/seller-reviews/${REVIEW_ID}/reports`, { reason: 'FAKE' }]
    ])('%s %s требует входа — гостю 401', async (method, path, body) => {
      const response = await request(app.getHttpServer())[method.toLowerCase() as 'get'](path).send(body)

      expect(response.status).toBe(401)
    })

    it('вошедший пользователь создаёт отзыв: id берётся из сессии, продавец — из адреса', async () => {
      signedInUserId = 'user'

      const response = await request(app.getHttpServer())
        .post(`/users/${SELLER_ID}/reviews`)
        .send({ rating: 5, text: 'Хорошо' })

      expect(response.status).toBe(201)
      expect(sellerReviewsService.create).toHaveBeenCalledWith('user', SELLER_ID, { rating: 5, text: 'Хорошо' })
    })

    it.each([
      ['оценка выше пяти', { rating: 6 }],
      ['оценка ниже единицы', { rating: 0 }],
      ['дробная оценка', { rating: 4.5 }],
      ['нет оценки', { text: 'Только текст' }],
      ['слишком длинный текст', { rating: 5, text: 'я'.repeat(1001) }],
      ['лишнее поле: попытка подставить вес', { rating: 5, weight: 100 }],
      ['лишнее поле: попытка подставить тип контакта', { rating: 5, contactType: 'DEAL_CONFIRMED' }]
    ])('создание с некорректным телом (%s) — 400', async (_name, body) => {
      signedInUserId = 'user'

      const response = await request(app.getHttpServer()).post(`/users/${SELLER_ID}/reviews`).send(body)

      expect(response.status).toBe(400)
      expect(sellerReviewsService.create).not.toHaveBeenCalled()
    })

    it('адрес с не-UUID продавцом — 400', async () => {
      const response = await request(app.getHttpServer()).get('/users/not-a-uuid/reviews')

      expect(response.status).toBe(400)
    })

    it('удаление отвечает 204 без тела', async () => {
      signedInUserId = 'user'

      const response = await request(app.getHttpServer()).delete(`/seller-reviews/${REVIEW_ID}`)

      expect(response.status).toBe(204)
      expect(sellerReviewsService.remove).toHaveBeenCalledWith(REVIEW_ID, 'user')
    })

    it('ответ продавца передаёт текст и id пользователя из сессии', async () => {
      signedInUserId = 'user'

      await request(app.getHttpServer()).put(`/seller-reviews/${REVIEW_ID}/reply`).send({ text: 'Спасибо' })

      expect(sellerReviewsService.reply).toHaveBeenCalledWith(REVIEW_ID, 'user', { text: 'Спасибо' })
    })

    it('жалоба: id пользователя из сессии, ответ 204 без тела', async () => {
      signedInUserId = 'user'

      const response = await request(app.getHttpServer())
        .post(`/seller-reviews/${REVIEW_ID}/reports`)
        .send({ reason: 'FAKE', comment: 'Этого покупателя не было' })

      expect(response.status).toBe(204)
      expect(reportsService.report).toHaveBeenCalledWith(REVIEW_ID, 'user', {
        reason: 'FAKE',
        comment: 'Этого покупателя не было'
      })
    })

    it.each([
      ['нет причины', {}],
      ['неизвестная причина', { reason: 'WHATEVER' }],
      ['слишком длинный комментарий', { reason: 'FAKE', comment: 'я'.repeat(1001) }],
      ['лишнее поле', { reason: 'FAKE', status: 'ACCEPTED' }]
    ])('жалоба с некорректным телом (%s) — 400', async (_name, body) => {
      signedInUserId = 'user'

      const response = await request(app.getHttpServer()).post(`/seller-reviews/${REVIEW_ID}/reports`).send(body)

      expect(response.status).toBe(400)
      expect(reportsService.report).not.toHaveBeenCalled()
    })

    it('пагинация: limit больше максимума — 400', async () => {
      const response = await request(app.getHttpServer()).get(`/users/${SELLER_ID}/reviews?limit=500`)

      expect(response.status).toBe(400)
    })
  })
})
