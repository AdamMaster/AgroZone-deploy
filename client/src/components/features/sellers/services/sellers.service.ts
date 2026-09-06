import { api } from '@/shared/api'
import { RequestOptions } from '@/shared/fetch'

import { IPublicSeller } from '../types/seller.types'

class SellersService {
  private URL = 'users'

  // requestOptions — { next: { revalidate: 120 } } для SSR (см.
  // sellers/[id]/page.tsx) — тот же приём, что и у adsService.findAll/
  // findOne. Публичный роут, без авторизации — бэкенд сам отдаёт 404 для
  // несуществующего/удалённого аккаунта (см. UserService.getPublicProfile).
  async findPublic(id: string, requestOptions?: RequestOptions): Promise<IPublicSeller> {
    const response = await api.get<IPublicSeller>(`${this.URL}/${id}/public`, requestOptions)
    return response
  }
}

export const sellersService = new SellersService()
