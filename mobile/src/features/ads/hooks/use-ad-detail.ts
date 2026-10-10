import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner-native'

import { adDetailApi } from '../api/ad-detail.api'
import type { AdDetail, AdReportReason } from '../types/ad-detail.types'

// Все запросы страницы объявления — под префиксом ['ads']: при входе и
// выходе они сбрасываются вместе с остальными объявлениями (auth-store).
export const adDetailQueryKey = (id: string) => ['ads', 'detail', id] as const
export const similarAdsQueryKeyPrefix = ['ads', 'similar'] as const
const ownerStatsQueryKey = (id: string) => ['ads', 'owner-stats', id] as const

// public — как видит любой посетитель (только опубликованное); owner —
// страница владельца, объявление в любом статусе (как /ads/:id/my сайта).
export type AdDetailView = 'public' | 'owner'

export function useAdDetail(id: string, view: AdDetailView) {
  return useQuery({
    queryKey: [...adDetailQueryKey(id), view],
    queryFn: ({ signal }) =>
      view === 'owner' ? adDetailApi.fetchForOwner(id, signal) : adDetailApi.fetchPublic(id, signal)
  })
}

// Похожие — та же категория, без самого объявления (как на сайте).
export function useSimilarAds(ad: AdDetail | undefined) {
  return useQuery({
    queryKey: [...similarAdsQueryKeyPrefix, ad?.id],
    queryFn: ({ signal }) => adDetailApi.fetchSimilar(ad!, signal),
    enabled: !!ad,
    select: response => response.items
  })
}

export function useAdCounters(id: string, { enabled }: { enabled: boolean }) {
  return useQuery({
    queryKey: [...ownerStatsQueryKey(id), 'counters'],
    queryFn: ({ signal }) => adDetailApi.fetchCounters(id, signal),
    enabled
  })
}

export function useAdViewStats(id: string, weekOffset: number) {
  return useQuery({
    queryKey: [...ownerStatsQueryKey(id), 'views', weekOffset],
    queryFn: ({ signal }) => adDetailApi.fetchViewStats(id, weekOffset, signal),
    // Пока грузится соседняя неделя, показываем текущую (полупрозрачной).
    placeholderData: keepPreviousData
  })
}

// «Показать телефон»: номер не лежит в объявлении — сервер выдаёт его
// отдельно, вошедшим и с ограничением частоты (от сбора номеров ботами).
export function useRevealPhone() {
  return useMutation({
    mutationFn: (id: string) => adDetailApi.fetchPhone(id),
    onError: error => toast.error(error.message)
  })
}

export function useReportAd() {
  return useMutation({
    mutationFn: ({ id, reason, comment }: { id: string; reason: AdReportReason; comment?: string }) =>
      adDetailApi.report(id, reason, comment),
    onSuccess: () => toast.success('Жалоба отправлена, спасибо — мы её рассмотрим'),
    onError: error => toast.error(error.message)
  })
}

type StatusAction = 'activate' | 'republish' | 'archive' | 'draft'

// Тексты уведомлений — как у хуков действий сайта (useActivateAd и т.д.).
const STATUS_ACTION_TOASTS: Record<StatusAction, { title: string; description?: string }> = {
  activate: { title: 'Объявление отправлено на модерацию' },
  republish: { title: 'Объявление опубликовано' },
  archive: {
    title: 'Объявление перенесено в архив',
    description: 'Его можно восстановить в течение 30 дней, затем оно удалится'
  },
  draft: { title: 'Объявление сохранено в черновики' }
}

// Действия владельца со своим объявлением. После любого из них
// перезапрашиваем всё, что показывает объявления: статус влияет и на
// «Мои объявления», и на ленты.
export function useAdOwnerActions(id: string) {
  const queryClient = useQueryClient()
  const refreshAds = () => queryClient.invalidateQueries({ queryKey: ['ads'] })

  const changeStatus = useMutation({
    mutationFn: (action: StatusAction) => adDetailApi[action](id),
    onSuccess: (_data, action) => {
      const { title, description } = STATUS_ACTION_TOASTS[action]
      toast.success(title, { description })
      void refreshAds()
    },
    onError: error => toast.error(error.message)
  })

  const remove = useMutation({
    mutationFn: () => adDetailApi.remove(id),
    onSuccess: () => {
      toast.success('Объявление успешно удалено!')
      // Само удалённое объявление не перезапрашиваем — страница, пока
      // закрывается, получила бы 404 и мигнула ошибкой.
      const [, scope, detailId] = adDetailQueryKey(id)
      void queryClient.invalidateQueries({
        queryKey: ['ads'],
        predicate: query => !(query.queryKey[1] === scope && query.queryKey[2] === detailId)
      })
    },
    onError: error => toast.error(error.message)
  })

  return {
    changeStatus: changeStatus.mutate,
    pendingAction: changeStatus.isPending ? changeStatus.variables : undefined,
    remove: remove.mutate,
    isRemoving: remove.isPending
  }
}
