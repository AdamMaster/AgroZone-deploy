'use client'

import { useQuery } from '@tanstack/react-query'

import { supportService } from '../services/support.service'

export function useSupportAdminConversations(enabled: boolean) {
  const query = useQuery({
    queryKey: ['support-admin-conversations'],
    queryFn: () => supportService.getAdminConversations(),
    enabled
  })

  return {
    conversations: query.data ?? [],
    isLoading: query.isLoading
  }
}
