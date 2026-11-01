import { UnauthorizedException } from '@nestjs/common'

import { AuthGuard } from './auth.guard'

describe('AuthGuard', () => {
  let userService: { findById: jest.Mock }
  let guard: AuthGuard

  const contextFor = (session: Record<string, unknown> | undefined) => {
    const request = { session: session && { destroy: jest.fn((cb: () => void) => cb()), ...session } } as any

    return {
      request,
      context: { switchToHttp: () => ({ getRequest: () => request }) } as any
    }
  }

  beforeEach(() => {
    userService = { findById: jest.fn().mockResolvedValue({ id: 'user-1', deletedAt: null, sessionVersion: 2 }) }
    guard = new AuthGuard(userService as never)
  })

  it('без входа — 401', async () => {
    const { context } = contextFor({})

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException)
  })

  it('действующая сессия пропускается, пользователь доступен дальше', async () => {
    const { context, request } = contextFor({ userId: 'user-1', sessionVersion: 2 })

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(request.user).toMatchObject({ id: 'user-1' })
  })

  it('сессия, открытая до смены пароля, отклоняется и удаляется из хранилища', async () => {
    const { context, request } = contextFor({ userId: 'user-1', sessionVersion: 1 })

    await expect(guard.canActivate(context)).rejects.toThrow('пароль был изменён')
    expect(request.session.destroy).toHaveBeenCalled()
  })

  it('старая сессия без номера действует, пока пароль ни разу не меняли', async () => {
    userService.findById.mockResolvedValue({ id: 'user-1', deletedAt: null, sessionVersion: 0 })
    const { context } = contextFor({ userId: 'user-1' })

    await expect(guard.canActivate(context)).resolves.toBe(true)
  })

  it('удалённый аккаунт не пропускается', async () => {
    userService.findById.mockResolvedValue({ id: 'user-1', deletedAt: new Date(), sessionVersion: 2 })
    const { context } = contextFor({ userId: 'user-1', sessionVersion: 2 })

    await expect(guard.canActivate(context)).rejects.toThrow('Аккаунт удалён')
  })
})
