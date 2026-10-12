import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner-native'

import { adFormApi } from '../api/ad-form.api'

// Объявления пользователя и страницы объявлений — под префиксом ['ads']:
// после подачи или правки всё это перезапрашивается.
const ADS_QUERY_KEY = ['ads'] as const

const showError = (error: Error) => toast.error(error.message)

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

interface UpdateAdVariables {
  body: FormData
  // Отклонённое объявление после правки сервер сам отправляет на повторную
  // проверку — тост говорит об этом прямо, как на сайте.
  wasRejected: boolean
}

export function useUpdateAd(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ body }: UpdateAdVariables) => adFormApi.update(id, body),
    onSuccess: (_ad, { wasRejected }) => {
      if (wasRejected) {
        toast.success('Объявление отправлено на повторную проверку', {
          description: 'Модератор рассмотрит его ещё раз, обычно это занимает около 15 минут'
        })
      } else {
        toast.success('Объявление успешно обновлено!')
      }
      void queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEY })
    },
    onError: showError
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
