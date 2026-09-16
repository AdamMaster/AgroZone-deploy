import { api } from '@/shared/api'

import { IAdminUserDetail, IAdminUserSearchResponse } from '../types/admin.types'

export interface CreateVerifiedUserPayload {
  phone: string
  password: string
  displayName?: string
}

interface CreateVerifiedUserResponse {
  id: string
  displayName: string
  phone: string
}

// Индекс-сигнатура нужна, чтобы TypeScript принял этот тип там, где
// ожидается TypeSearchParams (см. api.get ниже) — тот же приём, что и у
// query-DTO остальных списочных сервисов.
export interface SearchUsersParams {
  query?: string
  page?: number
  limit?: number
  [key: string]: string | number | undefined
}

class UsersAdminService {
  private URL = 'users'

  // Создать продавцу аккаунт вручную, минуя подтверждение звонком — см.
  // UserController.createVerifiedByAdmin/UserService.createVerifiedByAdmin
  // на сервере. Раньше это делалось только вручную через терминал
  // (server/scripts/create-verified-user.ts), пользователь попросил
  // перенести в админку — сама команда в репозитории тоже осталась
  // (на случай, если админка почему-то недоступна).
  async createVerified(payload: CreateVerifiedUserPayload): Promise<CreateVerifiedUserResponse> {
    return api.post<CreateVerifiedUserResponse>(`${this.URL}/admin/create-verified`, payload)
  }

  // Поиск по имени/email/телефону одной строкой — см.
  // UserController.searchByAdmin/UserService.searchByAdmin на сервере.
  async search(params: SearchUsersParams): Promise<IAdminUserSearchResponse> {
    return api.get<IAdminUserSearchResponse>(`${this.URL}/admin/search`, { params })
  }

  // Полная карточка пользователя для /admin/users/:id — переиспользует уже
  // существовавший (но раньше ничем не вызывавшийся с фронта) эндпоинт
  // GET users/by-id/:id, см. UserController.findById.
  async findById(id: string): Promise<IAdminUserDetail> {
    return api.get<IAdminUserDetail>(`${this.URL}/by-id/${id}`)
  }
}

export const usersAdminService = new UsersAdminService()
