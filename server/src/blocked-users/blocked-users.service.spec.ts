import type { EventEmitter2 } from '@nestjs/event-emitter'

import { CONVERSATION_REMOVED_EVENT } from '@/conversations/conversations.events'
import type { PrismaService } from '@/prisma/prisma.service'

import { BlockedUsersService } from './blocked-users.service'

describe('BlockedUsersService: блокировка скрывает диалоги', () => {
  let prisma: any
  let eventEmitter: { emit: jest.Mock }
  let service: BlockedUsersService

  beforeEach(() => {
    prisma = {
      blockedUser: { upsert: jest.fn().mockResolvedValue({}), deleteMany: jest.fn() },
      conversation: {
        findMany: jest.fn().mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 })
      },
      $transaction: jest.fn().mockResolvedValue([])
    }
    eventEmitter = { emit: jest.fn() }

    service = new BlockedUsersService(prisma as PrismaService, eventEmitter as unknown as EventEmitter2)
  })

  it('диалоги, которые были видны, пропадают и на других устройствах блокирующего', async () => {
    await service.blockUser('a', 'b')

    expect(prisma.conversation.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { buyerId: 'a', sellerId: 'b', hiddenByBuyer: false },
          { sellerId: 'a', buyerId: 'b', hiddenBySeller: false }
        ]
      },
      select: { id: true }
    })
    expect(eventEmitter.emit).toHaveBeenCalledTimes(2)
    expect(eventEmitter.emit).toHaveBeenCalledWith(CONVERSATION_REMOVED_EVENT, { conversationId: 'c1', userId: 'a' })
    expect(eventEmitter.emit).toHaveBeenCalledWith(CONVERSATION_REMOVED_EVENT, { conversationId: 'c2', userId: 'a' })
  })

  it('если скрывать нечего, события нет', async () => {
    prisma.conversation.findMany.mockResolvedValue([])

    await service.blockUser('a', 'b')

    expect(eventEmitter.emit).not.toHaveBeenCalled()
  })

  it('себя заблокировать нельзя, ничего не меняется', async () => {
    await expect(service.blockUser('a', 'a')).rejects.toThrow()

    expect(prisma.conversation.findMany).not.toHaveBeenCalled()
    expect(eventEmitter.emit).not.toHaveBeenCalled()
  })
})
