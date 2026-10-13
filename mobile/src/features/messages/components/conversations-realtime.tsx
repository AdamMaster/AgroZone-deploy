import { useAuthStore } from '@/features/auth/store/auth-store'

import { useConversationsRealtime } from '../hooks/use-conversations-realtime'

// Живое соединение с диалогами по объявлениям, пока пользователь вошёл.
export function ConversationsRealtime() {
  const isSignedIn = useAuthStore(state => state.status === 'signedIn')

  useConversationsRealtime(isSignedIn)

  return null
}
