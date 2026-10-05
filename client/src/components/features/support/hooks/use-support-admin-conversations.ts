'use client'

import { useQuery } from '@tanstack/react-query'

import { supportService } from '../services/support.service'
import { ISupportAdminConversationListItem } from '../types/support.types'

// Один и тот же массив на все рендеры, пока данных нет: `?? []` каждый раз
// давал бы новую ссылку, и эффекты с conversations в зависимостях
// перезапускались бы на каждый рендер.
const NO_CONVERSATIONS: ISupportAdminConversationListItem[] = []

export function useSupportAdminConversations(enabled: boolean) {
  const query = useQuery({
    queryKey: ['support-admin-conversations'],
    queryFn: () => supportService.getAdminConversations(),
    enabled
  })

  return {
    conversations: query.data ?? NO_CONVERSATIONS,
    isLoading: query.isLoading
  }
}
