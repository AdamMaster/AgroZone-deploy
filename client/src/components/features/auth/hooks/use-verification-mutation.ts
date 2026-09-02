'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { verificationService } from '../services'

export function useVerificationMutation() {
  const router = useRouter()

  const { mutate: verification } = useMutation({
    mutationKey: ['new virification'],
    mutationFn: (token: string | null) => verificationService.newVerification(token),
    onSuccess() {
      toast.success('Почта успешно подтверждена')
      router.replace('/profile/settings')
    }
  })

  return { verification }
}
