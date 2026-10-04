import { Test, TestingModule } from '@nestjs/testing'

import { PrismaService } from '@/prisma/prisma.service'

import { AdminDashboardService } from './admin-dashboard.service'

// Сам PrismaService тянет за собой сгенерированный клиент, а тесту нужен
// только токен для DI — реальную работу с базой подменяют моки ниже.
jest.mock('@/prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }))

// 4 октября 2026, 13:00 по Москве.
const NOW = new Date('2026-10-04T10:00:00Z')

describe('AdminDashboardService', () => {
  let service: AdminDashboardService
  let prisma: any

  // Сервис запускает четыре сырых запроса в фиксированном порядке:
  // регистрации, объявления, жалобы, платежи — тест отвечает им по очереди.
  const mockRawRows = (rows: { users?: any[]; ads?: any[]; reports?: any[]; payments?: any[] }) => {
    prisma.$queryRaw
      .mockResolvedValueOnce(rows.users ?? [])
      .mockResolvedValueOnce(rows.ads ?? [])
      .mockResolvedValueOnce(rows.reports ?? [])
      .mockResolvedValueOnce(rows.payments ?? [])
  }

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn(),
      ad: {
        aggregate: jest.fn().mockResolvedValue({ _count: { _all: 0 }, _min: { createdAt: null } })
      },
      adReport: { count: jest.fn().mockResolvedValue(0) },
      dealerFeed: { count: jest.fn().mockResolvedValue(0) }
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminDashboardService, { provide: PrismaService, useValue: prisma }]
    }).compile()

    service = module.get(AdminDashboardService)
  })

  it('строит ряд ровно на запрошенное число дней, заполняя пустые нулями', async () => {
    mockRawRows({})

    const result = await service.getDashboard(7, NOW)

    expect(result.days).toBe(7)
    expect(result.timeZone).toBe('Europe/Moscow')
    expect(result.series).toHaveLength(7)
    expect(result.series[0].date).toBe('2026-09-28')
    expect(result.series[6].date).toBe('2026-10-04')
    expect(result.series.every(point => point.registrations === 0 && point.revenueKopecks === 0)).toBe(true)
    expect(result.period.byKind.bump).toEqual({ count: 0, amountKopecks: 0 })
  })

  it('раскладывает регистрации, объявления и жалобы по дням, сегодня и вчера берёт из ряда', async () => {
    mockRawRows({
      users: [
        { day: '2026-10-04', count: 5 },
        { day: '2026-10-03', count: 2 }
      ],
      ads: [{ day: '2026-10-04', count: BigInt(9) }],
      reports: [{ day: '2026-10-03', count: 1 }]
    })

    const result = await service.getDashboard(7, NOW)

    expect(result.today).toMatchObject({ registrations: 5, newAds: 9, newReports: 0 })
    expect(result.yesterday).toMatchObject({ registrations: 2, newAds: 0, newReports: 1 })
    expect(result.period).toMatchObject({ registrations: 7, newAds: 9, newReports: 1 })
  })

  it('суммирует платежи по дням и видам, принимая bigint из SQL', async () => {
    mockRawRows({
      payments: [
        { kind: 'bump', day: '2026-10-04', count: 2, amount: BigInt(29800) },
        { kind: 'premium', day: '2026-10-04', count: 1, amount: BigInt(49900) },
        { kind: 'bump', day: '2026-10-02', count: 1, amount: BigInt(14900) },
        { kind: 'dealerSubscription', day: '2026-10-01', count: 1, amount: BigInt(300000) }
      ]
    })

    const result = await service.getDashboard(7, NOW)

    expect(result.today).toMatchObject({ paymentsCount: 3, revenueKopecks: 79700 })
    expect(result.yesterday).toMatchObject({ paymentsCount: 0, revenueKopecks: 0 })
    expect(result.period).toMatchObject({ paymentsCount: 5, revenueKopecks: 394600 })
    expect(result.period.byKind).toEqual({
      bump: { count: 3, amountKopecks: 44700 },
      premium: { count: 1, amountKopecks: 49900 },
      adServices: { count: 0, amountKopecks: 0 },
      dealerSubscription: { count: 1, amountKopecks: 300000 }
    })
  })

  it('игнорирует строки за пределами окна (граница суток по Москве)', async () => {
    mockRawRows({
      users: [{ day: '2026-09-01', count: 100 }],
      payments: [{ kind: 'bump', day: '2026-09-01', count: 1, amount: 100 }]
    })

    const result = await service.getDashboard(7, NOW)

    expect(result.period.registrations).toBe(0)
    expect(result.period.paymentsCount).toBe(0)
    expect(result.period.byKind.bump.count).toBe(0)
  })

  it('отдаёт очереди модерации "на сейчас"', async () => {
    mockRawRows({})
    prisma.ad.aggregate.mockResolvedValue({
      _count: { _all: 4 },
      _min: { createdAt: new Date('2026-10-01T08:00:00Z') }
    })
    prisma.adReport.count.mockResolvedValue(3)
    prisma.dealerFeed.count.mockResolvedValue(1)

    const result = await service.getDashboard(7, NOW)

    expect(result.queues).toEqual({
      adsPending: 4,
      oldestAdPendingAt: '2026-10-01T08:00:00.000Z',
      reportsPending: 3,
      dealerFeedsPending: 1
    })
    expect(prisma.ad.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PENDING' } }))
    expect(prisma.adReport.count).toHaveBeenCalledWith({ where: { status: 'PENDING' } })
    expect(prisma.dealerFeed.count).toHaveBeenCalledWith({ where: { status: 'PENDING_REVIEW' } })
  })

  it('пустая очередь — oldestAdPendingAt null', async () => {
    mockRawRows({})

    const result = await service.getDashboard(7, NOW)

    expect(result.queues.oldestAdPendingAt).toBeNull()
  })

  it('ограничивает выборку началом первого дня периода по Москве (в UTC)', async () => {
    mockRawRows({})

    await service.getDashboard(30, NOW)

    // Первый день окна — 5 сентября, его московская полночь = 4 сентября 21:00 UTC.
    for (const call of prisma.$queryRaw.mock.calls) {
      expect(call[0].values).toContain('2026-09-04T21:00:00.000Z')
    }
  })

  it('считает деньги только по оплаченным платежам из всех четырёх таблиц', async () => {
    mockRawRows({})

    await service.getDashboard(7, NOW)

    const sql: string = prisma.$queryRaw.mock.calls[3][0].sql
    for (const table of ['ad_bumps', 'premium_purchases', 'ad_service_purchases', 'dealer_subscriptions']) {
      expect(sql).toContain(table)
    }
    expect(sql.match(/status = 'SUCCEEDED'/g)).toHaveLength(4)
  })

  it('исключает черновики из новых объявлений', async () => {
    mockRawRows({})

    await service.getDashboard(7, NOW)

    expect(prisma.$queryRaw.mock.calls[1][0].sql).toContain("status <> 'DRAFT'")
  })
})
