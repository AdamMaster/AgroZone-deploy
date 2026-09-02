import { api } from '@/shared/api'

import { IBlockedUser } from '../types/message.types'

class BlockedUsersService {
  private URL = 'blocked-users'

  async findAll(): Promise<IBlockedUser[]> {
    return api.get<IBlockedUser[]>(this.URL)
  }

  async block(userId: string): Promise<void> {
    await api.post(`${this.URL}/${userId}`, {})
  }

  async unblock(userId: string): Promise<void> {
    await api.delete(`${this.URL}/${userId}`)
  }
}

export const blockedUsersService = new BlockedUsersService()
