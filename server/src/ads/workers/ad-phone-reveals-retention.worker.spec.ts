import { PrismaService } from '@/prisma/prisma.service'

import { AD_PHONE_REVEALS_RETENTION_DAYS } from '../constants/ads.constants'
import { AdPhoneRevealsRetentionWorker } from './ad-phone-reveals-retention.worker'

const MS_PER_DAY = 24 * 60 * 60 * 1000

describe('AdPhoneRevealsRetentionWorker', () => {
  const deleteMany = jest.fn()
  let worker: AdPhoneRevealsRetentionWorker

  beforeEach(() => {
    jest.clearAllMocks()
    deleteMany.mockResolvedValue({ count: 3 })
    worker = new AdPhoneRevealsRetentionWorker({ adPhoneReveal: { deleteMany } } as unknown as PrismaService)
  })

  describe('purgeExpired', () => {
    it('удаляет записи строго старше срока хранения и возвращает их число', async () => {
      const now = new Date('2026-10-28T12:00:00Z')

      const deleted = await worker.purgeExpired(now)

      expect(deleted).toBe(3)
      expect(deleteMany).toHaveBeenCalledWith({
        where: { createdAt: { lt: new Date(now.getTime() - AD_PHONE_REVEALS_RETENTION_DAYS * MS_PER_DAY) } }
      })
    })
  })

  describe('purgeExpiredReveals', () => {
    it('не падает, если очистка завершилась ошибкой (ночной воркер не должен ронять процесс)', async () => {
      deleteMany.mockRejectedValue(new Error('db down'))

      await expect(worker.purgeExpiredReveals()).resolves.toBeUndefined()
    })
  })
})
