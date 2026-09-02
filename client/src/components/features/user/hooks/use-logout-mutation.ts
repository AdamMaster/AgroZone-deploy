'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { authService } from '../../auth/services'

export function useLogoutMutation() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { mutate: logout, isPending: isLoadingLogout } = useMutation({
    mutationKey: ['logout'],
    mutationFn: () => authService.logout(),
    onSuccess() {
      // queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.setQueryData(['profile'], null)
      toast.success('Вы успешно вышли из системы')
      router.push('/?auth=true')
    },
    onError(error) {
      toastMessageHandler(error)
    }
  })

  return { logout, isLoadingLogout }
}
