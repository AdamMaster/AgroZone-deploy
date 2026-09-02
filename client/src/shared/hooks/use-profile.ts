'use client'

import { useQuery } from '@tanstack/react-query'

import { userServices } from '@/components/features/user/services'

export function useProfile() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => userServices.findProfile()
  })

  return { user, isLoading }
}
