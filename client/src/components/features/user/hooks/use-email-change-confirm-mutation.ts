'use client'
import { useMutation } from '@tanstack/react-query'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

import { toastMessageHandler } from '@/shared/utils'

import { emailChangeService } from '../services/email-change.service'

export function useChangeEmailConfirmMutation() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const { mutate: confirmChange, isPending: isLoadingConfirm } = useMutation({
    mutationKey: ['change email confirm'],

    mutationFn: () => emailChangeService.confirm(token),

    onSuccess() {
      toast.success('Почта успешно изменена')
      router.push('/profile/settings')
    },

    onError(error) {
      toastMessageHandler(error)
      router.push('/profile/settings')
    }
  })

  return { confirmChange, isLoadingConfirm }
}
