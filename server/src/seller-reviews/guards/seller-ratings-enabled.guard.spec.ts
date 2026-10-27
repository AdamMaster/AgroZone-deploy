import { NotFoundException } from '@nestjs/common'

import { SellerRatingsEnabledGuard } from './seller-ratings-enabled.guard'

describe('SellerRatingsEnabledGuard', () => {
  const guardWith = (sellerRatings: boolean) =>
    new SellerRatingsEnabledGuard({ getFlags: jest.fn().mockResolvedValue({ sellerRatings }) } as never)

  it('пока рейтинги выключены, ручка отвечает 404, как несуществующий адрес', async () => {
    await expect(guardWith(false).canActivate()).rejects.toBeInstanceOf(NotFoundException)
  })

  it('когда рейтинги включены, пропускает запрос', async () => {
    await expect(guardWith(true).canActivate()).resolves.toBe(true)
  })
})
