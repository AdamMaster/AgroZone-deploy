import { api } from '@/shared/api'

interface CreateVerifiedUserPayload {
  phone: string
  password: string
  displayName?: string
}

interface CreateVerifiedUserResponse {
  id: string
  displayName: string
  phone: string
}

class UsersAdminService {
  private URL = 'users/admin'

  // Создать продавцу аккаунт вручную, минуя подтверждение звонком — см.
  // UserController.createVerifiedByAdmin/UserService.createVerifiedByAdmin
  // на сервере. Раньше это делалось только вручную через терминал
  // (server/scripts/create-verified-user.ts), пользователь попросил
  // перенести в админку — сама команда в репозитории тоже осталась
  // (на случай, если админка почему-то недоступна).
  async createVerified(payload: CreateVerifiedUserPayload): Promise<CreateVerifiedUserResponse> {
    return api.post<CreateVerifiedUserResponse>(`${this.URL}/create-verified`, payload)
  }
}

export const usersAdminService = new UsersAdminService()
