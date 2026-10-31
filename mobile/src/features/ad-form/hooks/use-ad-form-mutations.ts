import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner-native'

import { adDetailApi } from '@/features/ads/api/ad-detail.api'

import { showError } from '@/lib/ui/show-error'

import { adFormApi } from '../api/ad-form.api'

// Объявления пользователя и страницы объявлений — под префиксом ['ads']:
// после подачи или правки всё это перезапрашивается.
const ADS_QUERY_KEY = ['ads'] as const

// Объявление для правки — всегда свежее с сервера, без кэша: форма не
// должна начинаться с устаревших значений.
export function useEditableAd(id: string) {
  return useQuery({
    queryKey: [...ADS_QUERY_KEY, 'edit', id],
    queryFn: ({ signal }) => adFormApi.fetchForEdit(id, signal),
    staleTime: 0,
    gcTime: 0
  })
}

export function useCreateAd() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: FormData) => adFormApi.create(body),
    onSuccess: () => {
      toast.success('Объявление успешно создано!')
      void queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEY })
    },
    onError: showError
  })
}

// Чем заканчивается сохранение правок:
//  - save — объявление остаётся как было (на проверку не уходит);
//  - resubmit — опубликованное или отклонённое объявление сервер сам
//    отправляет на повторную проверку;
//  - publish — «Сохранить и опубликовать» для черновика, архивного и
//    истёкшего: правки, затем отправка на модерацию.
export type UpdateAdMode = 'save' | 'resubmit' | 'publish'

interface UpdateAdVariables {
  body: FormData
  mode: UpdateAdMode
}

// Тосты — как у хуков сайта (useUpdateAd, useActivateAd).
const UPDATE_TOASTS: Record<UpdateAdMode, { title: string; description?: string }> = {
  save: { title: 'Объявление успешно обновлено!' },
  resubmit: {
    title: 'Объявление отправлено на повторную проверку',
    description: 'Модератор рассмотрит его ещё раз, обычно это занимает около 15 минут'
  },
  publish: {
    title: 'Объявление отправлено на модерацию',
    description: 'Модератор проверит его, обычно это занимает около 15 минут'
  }
}

export function useUpdateAd(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ body, mode }: UpdateAdVariables) => {
      await adFormApi.update(id, body)
      if (mode === 'publish') await adDetailApi.activate(id)
    },
    onSuccess: (_result, { mode }) => {
      const { title, description } = UPDATE_TOASTS[mode]
      toast.success(title, { description })
      void queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEY })
    },
    onError: error => {
      showError(error)
      // Правки могли сохраниться, даже если отправка на модерацию не прошла.
      void queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEY })
    }
  })
}

// Черновик: первое сохранение создаёт его, следующие — обновляют тот же
// (а не плодят новые). У правки черновика id есть сразу.
export function useSaveDraft(initialDraftId?: string) {
  const queryClient = useQueryClient()
  const [draftId, setDraftId] = useState(initialDraftId)

  return useMutation({
    mutationFn: (body: FormData) => adFormApi.saveDraft(body, draftId),
    onSuccess: ad => {
      toast.success('Черновик успешно сохранен!')
      if (!draftId) setDraftId(ad.id)
      void queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEY })
    },
    onError: showError
  })
}
