import { Injectable } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { AdStatus } from '@/generated/prisma/enums'

import { AdStateMachineService } from '@/ads/ad-state-machine.service'

// Приостановка и возврат опубликованных объявлений продавца. Работает
// внутри транзакции вызывающего, чтобы статус объявлений и решение по
// жалобам менялись вместе.
@Injectable()
export class SellerAdsSuspensionService {
  constructor(private readonly adStateMachine: AdStateMachineService) {}

  // Возвращает число приостановленных объявлений.
  async suspend(tx: Prisma.TransactionClient, sellerId: string): Promise<number> {
    const { count } = await tx.ad.updateMany({
      where: { userId: sellerId, status: AdStatus.PUBLISHED },
      data: { status: this.adStateMachine.transition(AdStatus.PUBLISHED, 'SUSPEND') }
    })

    return count
  }

  // Возвращает число объявлений, вышедших из приостановки. Срок публикации
  // шёл, пока объявление было приостановлено: вышедшее за срок возвращается
  // сразу истёкшим, а не публикуется на время до запуска воркера истечения.
  async restore(tx: Prisma.TransactionClient, sellerId: string): Promise<number> {
    const now = new Date()

    const expired = await tx.ad.updateMany({
      where: { userId: sellerId, status: AdStatus.SUSPENDED, expiresAt: { lte: now } },
      data: { status: AdStatus.EXPIRED }
    })

    const restored = await tx.ad.updateMany({
      where: { userId: sellerId, status: AdStatus.SUSPENDED },
      data: { status: this.adStateMachine.transition(AdStatus.SUSPENDED, 'RESTORE') }
    })

    return expired.count + restored.count
  }
}
