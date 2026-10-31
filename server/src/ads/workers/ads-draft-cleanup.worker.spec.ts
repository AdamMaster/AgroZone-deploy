import { AdsDraftCleanupWorker } from './ads-draft-cleanup.worker'

const DAY_MS = 24 * 60 * 60 * 1000

describe('AdsDraftCleanupWorker', () => {
  let prisma: { ad: { findMany: jest.Mock; delete: jest.Mock } }
  let fileService: { deleteFileByUrl: jest.Mock }
  let notificationsService: { notifyDraftsExpiring: jest.Mock }
  let worker: AdsDraftCleanupWorker

  const NOW = new Date('2026-11-30T03:30:00.000Z').getTime()

  // Первый findMany — окно предупреждения, второй — просроченные.
  const mockQueries = (expiring: unknown[], expired: unknown[]) => {
    prisma.ad.findMany.mockResolvedValueOnce(expiring).mockResolvedValueOnce(expired)
  }

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW)

    prisma = { ad: { findMany: jest.fn().mockResolvedValue([]), delete: jest.fn().mockResolvedValue({}) } }
    fileService = { deleteFileByUrl: jest.fn().mockResolvedValue(undefined) }
    notificationsService = { notifyDraftsExpiring: jest.fn().mockResolvedValue({}) }
    worker = new AdsDraftCleanupWorker(prisma as any, fileService as any, notificationsService as any)
  })

  afterEach(() => jest.useRealTimers())

  describe('предупреждение', () => {
    it('ищет черновики, которые не менялись 27–28 суток, у живых аккаунтов', async () => {
      await worker.cleanupDrafts()

      expect(prisma.ad.findMany.mock.calls[0][0].where).toEqual({
        status: 'DRAFT',
        updatedAt: { gt: new Date(NOW - 28 * DAY_MS), lte: new Date(NOW - 27 * DAY_MS) },
        user: { deletedAt: null }
      })
    })

    it('одно предупреждение на владельца со всеми его черновиками', async () => {
      mockQueries(
        [
          { id: 'd1', title: 'Трактор', userId: 'u1' },
          { id: 'd2', title: 'Зерно', userId: 'u2' },
          { id: 'd3', title: 'Семена', userId: 'u1' }
        ],
        []
      )

      await worker.cleanupDrafts()

      expect(notificationsService.notifyDraftsExpiring).toHaveBeenCalledTimes(2)
      expect(notificationsService.notifyDraftsExpiring).toHaveBeenCalledWith(
        'u1',
        [
          { id: 'd1', title: 'Трактор' },
          { id: 'd3', title: 'Семена' }
        ],
        3
      )
      expect(notificationsService.notifyDraftsExpiring).toHaveBeenCalledWith('u2', [{ id: 'd2', title: 'Зерно' }], 3)
    })

    it('сбой у одного владельца не лишает предупреждения остальных', async () => {
      mockQueries(
        [
          { id: 'd1', title: 'A', userId: 'u1' },
          { id: 'd2', title: 'B', userId: 'u2' }
        ],
        []
      )
      notificationsService.notifyDraftsExpiring.mockRejectedValueOnce(new Error('db down'))

      await worker.cleanupDrafts()

      expect(notificationsService.notifyDraftsExpiring).toHaveBeenCalledTimes(2)
    })

    it('нет черновиков в окне — ничего не отправляется', async () => {
      await worker.cleanupDrafts()

      expect(notificationsService.notifyDraftsExpiring).not.toHaveBeenCalled()
    })
  })

  describe('удаление', () => {
    it('берёт черновики, которые не менялись 30+ суток', async () => {
      await worker.cleanupDrafts()

      expect(prisma.ad.findMany.mock.calls[1][0].where).toEqual({
        status: 'DRAFT',
        updatedAt: { lte: new Date(NOW - 30 * DAY_MS) }
      })
    })

    it('удаляет фото из S3, затем запись', async () => {
      const order: string[] = []
      fileService.deleteFileByUrl.mockImplementation(async (url: string) => void order.push(`s3:${url}`))
      prisma.ad.delete.mockImplementation(async () => void order.push('db'))
      mockQueries([], [{ id: 'd1', images: ['a.jpg', 'b.jpg'] }])

      await worker.cleanupDrafts()

      expect(order).toEqual(['s3:a.jpg', 's3:b.jpg', 'db'])
      expect(prisma.ad.delete).toHaveBeenCalledWith({ where: { id: 'd1' } })
    })

    it('черновик без фото удаляется без обращений к S3', async () => {
      mockQueries([], [{ id: 'd1', images: [] }])

      await worker.cleanupDrafts()

      expect(fileService.deleteFileByUrl).not.toHaveBeenCalled()
      expect(prisma.ad.delete).toHaveBeenCalledTimes(1)
    })

    it('сбой S3 оставляет запись (подберётся ночью позже), остальные черновики удаляются', async () => {
      fileService.deleteFileByUrl.mockRejectedValueOnce(new Error('S3 down'))
      mockQueries(
        [],
        [
          { id: 'd1', images: ['a.jpg'] },
          { id: 'd2', images: ['b.jpg'] }
        ]
      )

      await worker.cleanupDrafts()

      expect(prisma.ad.delete).toHaveBeenCalledTimes(1)
      expect(prisma.ad.delete).toHaveBeenCalledWith({ where: { id: 'd2' } })
    })

    it('сбой предупреждений не мешает удалению', async () => {
      prisma.ad.findMany.mockRejectedValueOnce(new Error('db down')).mockResolvedValueOnce([{ id: 'd1', images: [] }])

      await worker.cleanupDrafts()

      expect(prisma.ad.delete).toHaveBeenCalledWith({ where: { id: 'd1' } })
    })
  })
})
