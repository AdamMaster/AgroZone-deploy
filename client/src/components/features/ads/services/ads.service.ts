import { api } from '@/shared/api'

import {
  IAd,
  IAdCounters,
  IAdsListResponse,
  IAdViewStats,
  ICreateAdReportDto,
  ILocationOption,
  IModerationAd,
  IPendingAd,
  IUpdateAdDto
} from '../types/ad.types'

class AdsService {
  private URL = 'ads'

  async create(data: FormData) {
    const response = await api.post(this.URL, data)
    return response
  }

  async publish(id: string) {
    const response = await api.patch(`${this.URL}/${id}/publish`)

    return response
  }

  async archive(id: string) {
    const response = await api.patch(`${this.URL}/${id}/archive`)

    return response
  }

  async activate(id: string) {
    const response = await api.patch(`${this.URL}/${id}/activate`)

    return response
  }

  async republish(id: string, data?: IUpdateAdDto) {
    const response = await api.patch(`${this.URL}/${id}/republish`, data || {})
    return response
  }

  async saveDraft(data: FormData, id?: string) {
    const url = id ? `${this.URL}/draft?id=${id}` : `${this.URL}/draft`
    const response = await api.post(url, data)
    return response
  }

  async draft(id: string) {
    const response = await api.patch(`${this.URL}/${id}/draft`)

    return response
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async findAll(params?: Record<string, any>): Promise<IAdsListResponse> {
    const response = await api.get<IAdsListResponse>(this.URL, { params })
    return response
  }

  async findLocations(): Promise<ILocationOption[]> {
    const response = await api.get<ILocationOption[]>(`${this.URL}/locations`)
    return response
  }

  async findMyAds(): Promise<IAd[]> {
    const response = await api.get<IAd[]>(`${this.URL}/my`)
    return response
  }

  async findOneForOwner(id: string): Promise<IAd> {
    const response = await api.get<IAd>(`${this.URL}/my/${id}`)
    return response
  }

  // Публичная карточка объявления — доступна без авторизации, сервер сам
  // отдаёт 404, если объявление не опубликовано/просрочено/не существует.
  // trackView: true — только для настоящего клиентского запроса (см.
  // useAd), у него есть реальные кука сессии и IP/UA браузера, которые
  // нужны бэкенду для записи статистики просмотров (см.
  // AdsController.findOne/AdsService.findOne). SSR-вызов этого же метода
  // в client/src/app/(main)/ads/[id]/page.tsx передавать trackView не
  // должен — там нет ни того, ни другого.
  async findOne(id: string, options?: { trackView?: boolean }): Promise<IAd> {
    const response = await api.get<IAd>(`${this.URL}/${id}`, {
      params: { trackView: options?.trackView }
    })
    return response
  }

  async update(id: string, data: FormData): Promise<IAd> {
    const response = await api.patch<IAd>(`${this.URL}/${id}`, data)
    return response
  }

  async publishDraft(id: string) {
    return api.patch(`${this.URL}/${id}/publish-draft`)
  }

  async addFavorite(id: string): Promise<void> {
    await api.post(`${this.URL}/${id}/favorite`)
  }

  async removeFavorite(id: string): Promise<void> {
    await api.delete(`${this.URL}/${id}/favorite`)
  }

  async getFavorites(params?: { page?: number; limit?: number }): Promise<IAd[]> {
    const response = await api.get<IAd[]>(`${this.URL}/me/favorites`, {
      params
    })

    return response
  }

  async remove(id: string) {
    const response = await api.delete(`${this.URL}/${id}`)
    return response
  }

  async reject(id: string, reason: string) {
    const response = await api.patch(`${this.URL}/${id}/reject`, { reason })

    return response
  }

  async report(id: string, dto: ICreateAdReportDto): Promise<void> {
    await api.post(`${this.URL}/${id}/reports`, { ...dto })
  }

  // Очередь модерации — только для админа (см. AdsController.findPending).
  async findPending(): Promise<IPendingAd[]> {
    return api.get<IPendingAd[]>(`${this.URL}/pending`)
  }

  // Полная карточка для предпросмотра модератором — только для админа (см.
  // AdsController.findOneForModeration), в отличие от findOne не
  // ограничена статусом PUBLISHED.
  async findOneForModeration(id: string): Promise<IModerationAd> {
    return api.get<IModerationAd>(`${this.URL}/${id}/moderation`)
  }

  // Статистика просмотров объявления — приватная, только для владельца
  // (см. AdsController.getMyAdViewStats). weekOffset — 0 текущая неделя, 1
  // прошлая и так далее.
  async getViewStats(id: string, weekOffset: number): Promise<IAdViewStats> {
    return api.get<IAdViewStats>(`${this.URL}/my/${id}/views`, { params: { weekOffset } })
  }

  // Компактные счётчики (просмотры всего/сегодня, избранное) — для панели
  // над фото, отдельно от getViewStats (см. AdsController.getMyAdCounters).
  async getCounters(id: string): Promise<IAdCounters> {
    return api.get<IAdCounters>(`${this.URL}/my/${id}/counters`)
  }
}

export const adsService = new AdsService()
