import type { Namespace, Socket } from 'socket.io'

import type { Message } from '@/generated/prisma/client'
import type { UserService } from '@/user/user.service'

import { ConversationsGateway } from './conversations.gateway'

describe('ConversationsGateway', () => {
  let userService: { findById: jest.Mock }
  let gateway: ConversationsGateway
  let emit: jest.Mock
  let to: jest.Mock

  const createSocket = (session?: { userId?: string }) => {
    const socket = {
      request: { session },
      join: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      disconnect: jest.fn()
    }

    return { socket, asSocket: socket as unknown as Socket }
  }

  beforeEach(() => {
    userService = { findById: jest.fn() }
    gateway = new ConversationsGateway(userService as unknown as UserService)

    emit = jest.fn()
    to = jest.fn().mockReturnValue({ emit })
    ;(gateway as unknown as { server: Partial<Namespace> }).server = { to } as unknown as Namespace
  })

  describe('handleConnection', () => {
    it('пускает вошедшего пользователя в его личную комнату', async () => {
      userService.findById.mockResolvedValue({ id: 'u1', deletedAt: null })
      const { socket, asSocket } = createSocket({ userId: 'u1' })

      await gateway.handleConnection(asSocket)

      expect(socket.join).toHaveBeenCalledWith('conversations:user:u1')
      expect(socket.disconnect).not.toHaveBeenCalled()
    })

    it('отказывает, если в сессии нет пользователя', async () => {
      const { socket, asSocket } = createSocket({})

      await gateway.handleConnection(asSocket)

      expect(socket.emit).toHaveBeenCalledWith('conversations:error', { code: 'UNAUTHORIZED' })
      expect(socket.disconnect).toHaveBeenCalledWith(true)
      expect(socket.join).not.toHaveBeenCalled()
    })

    it('отказывает, если аккаунт удалён или не найден', async () => {
      userService.findById.mockResolvedValueOnce({ id: 'u1', deletedAt: new Date() })
      userService.findById.mockRejectedValueOnce(new Error('not found'))

      for (const _ of [0, 1]) {
        const { socket, asSocket } = createSocket({ userId: 'u1' })
        await gateway.handleConnection(asSocket)

        expect(socket.disconnect).toHaveBeenCalledWith(true)
        expect(socket.join).not.toHaveBeenCalled()
      }
    })

    it('отключает сокет, если разбор подключения упал', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined)
      userService.findById.mockResolvedValue({ id: 'u1', deletedAt: null })
      const { socket, asSocket } = createSocket({ userId: 'u1' })
      socket.join.mockRejectedValue(new Error('boom'))

      await gateway.handleConnection(asSocket)

      expect(socket.disconnect).toHaveBeenCalledWith(true)
    })
  })

  it('новое сообщение уходит в комнаты обоих участников', () => {
    const message = { id: 'm1', conversationId: 'c1', senderId: 'u1', text: 'Привет' } as Message

    gateway.handleMessageCreated({ message, participantIds: ['u1', 'u2'] })

    expect(to).toHaveBeenCalledWith(['conversations:user:u1', 'conversations:user:u2'])
    expect(emit).toHaveBeenCalledWith('conversations:message', { conversationId: 'c1', message })
  })

  it('смена отметки сделки уходит в комнаты покупателя и продавца', () => {
    const dealConfirmedAt = new Date('2026-10-26T12:00:00.000Z')

    gateway.handleDealChanged({ conversationId: 'c1', dealConfirmedAt, participantIds: ['buyer', 'seller'] })

    expect(to).toHaveBeenCalledWith(['conversations:user:buyer', 'conversations:user:seller'])
    expect(emit).toHaveBeenCalledWith('conversations:deal', { conversationId: 'c1', dealConfirmedAt })
  })

  it('«прочитано» и «убрано» уходят только в комнату самого пользователя', () => {
    gateway.handleRead({ conversationId: 'c1', userId: 'u1' })
    gateway.handleRemoved({ conversationId: 'c2', userId: 'u1' })

    expect(to).toHaveBeenNthCalledWith(1, 'conversations:user:u1')
    expect(emit).toHaveBeenNthCalledWith(1, 'conversations:read', { conversationId: 'c1' })
    expect(to).toHaveBeenNthCalledWith(2, 'conversations:user:u1')
    expect(emit).toHaveBeenNthCalledWith(2, 'conversations:removed', { conversationId: 'c2' })
  })
  describe('isUserOnline', () => {
    it('в сети, пока в личной комнате есть хотя бы одно соединение', () => {
      const rooms = new Map<string, Set<string>>([['conversations:user:u1', new Set(['socket-1'])]])
      ;(gateway as unknown as { server: object }).server = { adapter: { rooms } }

      expect(gateway.isUserOnline('u1')).toBe(true)
      expect(gateway.isUserOnline('u2')).toBe(false)
    })

    it('пустая комната — не в сети', () => {
      const rooms = new Map<string, Set<string>>([['conversations:user:u1', new Set()]])
      ;(gateway as unknown as { server: object }).server = { adapter: { rooms } }

      expect(gateway.isUserOnline('u1')).toBe(false)
    })
  })
})
