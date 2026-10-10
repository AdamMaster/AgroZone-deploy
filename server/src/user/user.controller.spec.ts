import 'reflect-metadata'

import { UserController } from './user.controller'

// Ручки, меняющие профиль, должны отвечать безопасным профилем
// (getProfileForClient), а не записью из базы с хэшем пароля.
describe('UserController: ответы ручек изменения профиля', () => {
  const SAFE_PROFILE = { id: 'user-1', hasPassword: true }
  const RAW_USER = { id: 'user-1', password: 'argon2-hash' }

  let userService: Record<string, jest.Mock>
  let fileService: Record<string, jest.Mock>
  let controller: UserController

  beforeEach(() => {
    userService = {
      update: jest.fn().mockResolvedValue(RAW_USER),
      verifyBusiness: jest.fn().mockResolvedValue(RAW_USER),
      updateAvatar: jest.fn().mockResolvedValue(RAW_USER),
      updatePresentation: jest.fn().mockResolvedValue(RAW_USER),
      removePresentation: jest.fn().mockResolvedValue(RAW_USER),
      updatePassword: jest.fn().mockResolvedValue(RAW_USER),
      toggleTwoFactor: jest.fn().mockResolvedValue(RAW_USER),
      getProfileForClient: jest.fn().mockResolvedValue(SAFE_PROFILE)
    }
    fileService = {
      uploadAvatar: jest.fn().mockResolvedValue({ url: 'https://cdn/avatars/1.jpg', fileId: 'avatars/1.jpg' }),
      uploadFile: jest.fn().mockResolvedValue({ url: 'https://cdn/presentations/1.pdf', fileId: 'presentations/1.pdf' })
    }
    controller = new UserController(userService as never, fileService as never, {} as never, {} as never)
  })

  const file = { originalname: 'price.pdf', size: 10, buffer: Buffer.from('x') } as Express.Multer.File

  it.each([
    ['PATCH profile', () => controller.updateProfile('user-1', { name: 'Иван' } as never)],
    ['POST profile/business-verification', () => controller.verifyBusiness('user-1', { inn: '7707083893' } as never)],
    ['PATCH profile/avatar', () => controller.updateAvatar('user-1', file)],
    ['PATCH profile/presentation', () => controller.updatePresentation('user-1', file)],
    ['DELETE profile/presentation', () => controller.removePresentation('user-1')],
    ['PATCH profile/password', () => controller.updatePassword('user-1', { newPassword: 'secret12' } as never)],
    ['PATCH 2fa', () => controller.toggleTwoFactor('user-1')]
  ])('%s отвечает профилем без хэша пароля', async (_name, call) => {
    const result = await call()

    expect(result).toBe(SAFE_PROFILE)
    expect(result).not.toHaveProperty('password')
    expect(userService.getProfileForClient).toHaveBeenCalledWith('user-1')
  })
})
