import { ConversationsPushListener } from './conversations-push.listener'

describe('ConversationsPushListener', () => {
  let prisma: any
  let pushService: { sendToUser: jest.Mock }
  let gateway: { isUserOnline: jest.Mock }
  let listener: ConversationsPushListener

  const createdAt = new Date('2026-10-29T12:00:00.000Z')
  const event = (text = 'Здравствуйте, трактор ещё продаётся?', extra: object = {}) => ({
    message: { id: 'm1', conversationId: 'c1', senderId: 'buyer', text, attachments: [], createdAt, ...extra } as any,
    participantIds: ['buyer', 'seller'] as [string, string]
  })

  beforeEach(() => {
    prisma = {
      conversation: {
        findUnique: jest.fn().mockResolvedValue({ buyerId: 'buyer', buyerLastReadAt: null, sellerLastReadAt: null })
      },
      user: { findUnique: jest.fn().mockResolvedValue({ displayName: 'Иван' }) },
      message: { count: jest.fn().mockResolvedValue(0) }
    }
    pushService = { sendToUser: jest.fn().mockResolvedValue(undefined) }
    gateway = { isUserOnline: jest.fn().mockReturnValue(false) }
    listener = new ConversationsPushListener(prisma, pushService as any, gateway as any)
  })

  it('получателю не в сети уходит push с именем, текстом и ссылкой на чат', async () => {
    await listener.handleMessageCreated(event())

    expect(pushService.sendToUser).toHaveBeenCalledWith('seller', {
      title: 'Иван',
      body: 'Здравствуйте, трактор ещё продаётся?',
      link: 'agrozone://chat/c1',
      data: { conversationId: 'c1' }
    })
  })

  it('сообщение только с фото подписано «Фото», длинный текст обрезается', async () => {
    await listener.handleMessageCreated(event('', { attachments: ['x'] }))
    expect(pushService.sendToUser).toHaveBeenLastCalledWith('seller', expect.objectContaining({ body: 'Фото' }))

    await listener.handleMessageCreated(event('я'.repeat(500)))
    const { body } = pushService.sendToUser.mock.calls[1][1] as { body: string }
    expect(body).toHaveLength(121)
  })

  it('получатель на связи (сайт или приложение открыты) — push не нужен', async () => {
    gateway.isUserOnline.mockReturnValue(true)

    await listener.handleMessageCreated(event())

    expect(pushService.sendToUser).not.toHaveBeenCalled()
  })

  it('серия сообщений подряд — один push', async () => {
    prisma.message.count.mockResolvedValue(1)

    await listener.handleMessageCreated(event())

    expect(pushService.sendToUser).not.toHaveBeenCalled()
  })

  it('прочтённые получателем сообщения серию не продлевают', async () => {
    const readAt = new Date('2026-10-29T11:59:30.000Z')
    prisma.conversation.findUnique.mockResolvedValue({
      buyerId: 'buyer',
      buyerLastReadAt: null,
      sellerLastReadAt: readAt
    })

    await listener.handleMessageCreated(event())

    expect(prisma.message.count).toHaveBeenCalledWith({
      where: { conversationId: 'c1', senderId: 'buyer', createdAt: { gte: readAt, lt: createdAt } }
    })
  })

  it('сбой не выбрасывается наружу', async () => {
    prisma.conversation.findUnique.mockRejectedValue(new Error('db down'))

    await expect(listener.handleMessageCreated(event())).resolves.toBeUndefined()
  })
})
