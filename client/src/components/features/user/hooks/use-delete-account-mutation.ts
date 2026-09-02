'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { TypeDeleteAccountSchema } from '../schemes'
import { userServices } from '../services'

export function useDeleteAccountMutation() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { mutate: deleteAccount, isPending: isDeleteAccountLoading } = useMutation({
    mutationKey: ['delete account'],

    mutationFn: (values: TypeDeleteAccountSchema) => userServices.deleteAccount(values),

    onSuccess() {
      // Сервер уже погасил сессию (см. UserController.deleteAccount) — тут
      // только чистим локальный кэш и уводим со страницы, как при обычном
      // выходе (см. useLogoutMutation).
      queryClient.setQueryData(['profile'], null)
      toast.success('Аккаунт удалён')
      router.push('/')
    }
  })

  return { deleteAccount, isDeleteAccountLoading }
}
