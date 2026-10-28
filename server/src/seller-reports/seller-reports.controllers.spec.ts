import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AuthGuard } from '@/auth/guards/auth.guard'
import { RolesGuard } from '@/auth/guards/roles.guard'
import { SellerRatingsEnabledGuard } from '@/seller-reviews/guards/seller-ratings-enabled.guard'
import { SiteSettingsService } from '@/site-settings/site-settings.service'
import { UserService } from '@/user/user.service'

import { SellerReportsAdminController } from './seller-reports-admin.controller'
import { SellerReportsModerationService } from './seller-reports-moderation.service'
import { SellerReportsController } from './seller-reports.controller'
import { SellerReportsService } from './seller-reports.service'

const SELLER_ID = '3fa26bd9-a473-415a-8f2e-0b1c2d3e4f50'
const AD_ID = '1798edb5-4e5a-4a6b-9c7d-8e9f0a1b2c3d'

// Настоящие гарды и ValidationPipe, как в main.ts; подменены сервисы и поиск
// пользователя.
describe('Контроллеры жалоб на продавцов (HTTP)', () => {
  let app: INestApplication
  let reportsService: { report: jest.Mock }
  let moderationService: Record<'findQueue' | 'getSellerCard' | 'resolve' | 'rollbackReviews', jest.Mock>
  let siteSettingsService: { getFlags: jest.Mock }
  let signedIn: { id: string; role: 'ADMIN' | 'USER' } | undefined

  beforeEach(async () => {
    signedIn = undefined
    reportsService = { report: jest.fn().mockResolvedValue(undefined) }
    moderationService = {
      findQueue: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
      getSellerCard: jest.fn().mockResolvedValue({ seller: { id: SELLER_ID } }),
      resolve: jest.fn().mockResolvedValue({ sellerId: SELLER_ID, action: 'WARN' }),
      rollbackReviews: jest.fn().mockResolvedValue({ sellerId: SELLER_ID, hidden: 3 })
    }
    siteSettingsService = { getFlags: jest.fn().mockResolvedValue({ sellerRatings: true }) }

    const moduleRef = await Test.createTestingModule({
      controllers: [SellerReportsController, SellerReportsAdminController],
      providers: [
        SellerRatingsEnabledGuard,
        AuthGuard,
        RolesGuard,
        { provide: SellerReportsService, useValue: reportsService },
        { provide: SellerReportsModerationService, useValue: moderationService },
        { provide: SiteSettingsService, useValue: siteSettingsService },
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

  describe('жалоба пользователя', () => {
    const url = `/users/${SELLER_ID}/reports`

    it('рейтинги выключены — 404 даже гостю', async () => {
      siteSettingsService.getFlags.mockResolvedValue({ sellerRatings: false })

      expect((await request(app.getHttpServer()).post(url).send({ reason: 'FAKE_AD' })).status).toBe(404)
      expect(reportsService.report).not.toHaveBeenCalled()
    })

    it('гостю 401', async () => {
      expect((await request(app.getHttpServer()).post(url).send({ reason: 'FAKE_AD' })).status).toBe(401)
    })

    it('вошедший жалуется: id из сессии, продавец из адреса, ответ 204', async () => {
      signedIn = { id: 'user', role: 'USER' }

      const response = await request(app.getHttpServer())
        .post(url)
        .send({ reason: 'PREPAYMENT_SCAM', adId: AD_ID, comment: 'Пропал после предоплаты' })

      expect(response.status).toBe(204)
      expect(reportsService.report).toHaveBeenCalledWith(SELLER_ID, 'user', {
        reason: 'PREPAYMENT_SCAM',
        adId: AD_ID,
        comment: 'Пропал после предоплаты'
      })
    })

    it.each([
      ['нет причины', {}],
      ['неизвестная причина', { reason: 'WHATEVER' }],
      ['adId не UUID', { reason: 'FAKE_AD', adId: 'x' }],
      ['слишком длинный комментарий', { reason: 'FAKE_AD', comment: 'я'.repeat(1001) }],
      ['лишнее поле: попытка подставить статус', { reason: 'FAKE_AD', status: 'ACCEPTED' }]
    ])('некорректное тело (%s) — 400', async (_name, body) => {
      signedIn = { id: 'user', role: 'USER' }

      expect((await request(app.getHttpServer()).post(url).send(body)).status).toBe(400)
      expect(reportsService.report).not.toHaveBeenCalled()
    })

    it('адрес с не-UUID продавцом — 400', async () => {
      signedIn = { id: 'user', role: 'USER' }

      expect((await request(app.getHttpServer()).post('/users/x/reports').send({ reason: 'FAKE_AD' })).status).toBe(400)
    })
  })

  describe('модерация жалоб (только админ, флаг не нужен)', () => {
    const routes: [string, string, object | undefined][] = [
      ['GET', '/admin/seller-reports', undefined],
      ['GET', `/admin/seller-reports/sellers/${SELLER_ID}`, undefined],
      ['POST', `/admin/seller-reports/sellers/${SELLER_ID}/resolution`, { action: 'WARN' }],
      ['POST', `/admin/seller-reports/sellers/${SELLER_ID}/reviews-rollback`, {}]
    ]

    it.each(routes)('%s %s — гостю 401', async (method, path, body) => {
      expect((await request(app.getHttpServer())[method.toLowerCase() as 'get'](path).send(body)).status).toBe(401)
    })

    it.each(routes)('%s %s — обычному пользователю 403', async (method, path, body) => {
      signedIn = { id: 'user', role: 'USER' }

      expect((await request(app.getHttpServer())[method.toLowerCase() as 'get'](path).send(body)).status).toBe(403)
      expect(Object.values(moderationService).every(fn => fn.mock.calls.length === 0)).toBe(true)
    })

    it('админ видит очередь и карточку даже при выключенных рейтингах', async () => {
      signedIn = { id: 'admin', role: 'ADMIN' }
      siteSettingsService.getFlags.mockResolvedValue({ sellerRatings: false })

      expect((await request(app.getHttpServer()).get('/admin/seller-reports?page=2&limit=10')).status).toBe(200)
      expect(moderationService.findQueue).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 10 }))
      expect((await request(app.getHttpServer()).get(`/admin/seller-reports/sellers/${SELLER_ID}`)).status).toBe(200)
      expect(moderationService.getSellerCard).toHaveBeenCalledWith(SELLER_ID)
    })

    it('решение: id модератора из сессии, заметка передаётся', async () => {
      signedIn = { id: 'admin', role: 'ADMIN' }

      const response = await request(app.getHttpServer())
        .post(`/admin/seller-reports/sellers/${SELLER_ID}/resolution`)
        .send({ action: 'SUSPEND_ADS', note: 'Обман' })

      expect(response.status).toBe(201)
      expect(moderationService.resolve).toHaveBeenCalledWith(SELLER_ID, 'admin', {
        action: 'SUSPEND_ADS',
        note: 'Обман'
      })
    })

    it.each([
      ['нет действия', {}],
      ['блокировки среди действий нет', { action: 'BLOCK' }],
      ['слишком длинная заметка', { action: 'WARN', note: 'я'.repeat(501) }],
      ['лишнее поле', { action: 'WARN', status: 'ACCEPTED' }]
    ])('решение с некорректным телом (%s) — 400', async (_name, body) => {
      signedIn = { id: 'admin', role: 'ADMIN' }

      const response = await request(app.getHttpServer())
        .post(`/admin/seller-reports/sellers/${SELLER_ID}/resolution`)
        .send(body)

      expect(response.status).toBe(400)
      expect(moderationService.resolve).not.toHaveBeenCalled()
    })

    it('откат отзывов: id модератора из сессии', async () => {
      signedIn = { id: 'admin', role: 'ADMIN' }

      const response = await request(app.getHttpServer())
        .post(`/admin/seller-reports/sellers/${SELLER_ID}/reviews-rollback`)
        .send({ note: 'Накрутка' })

      expect(response.status).toBe(201)
      expect(moderationService.rollbackReviews).toHaveBeenCalledWith(SELLER_ID, 'admin', { note: 'Накрутка' })
    })
  })
})
