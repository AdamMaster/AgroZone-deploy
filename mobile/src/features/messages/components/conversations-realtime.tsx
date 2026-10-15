import { useIsSignedIn } from '@/features/auth/hooks/use-is-signed-in'

import { useConversationsRealtime } from '../hooks/use-conversations-realtime'

// Живое соединение с диалогами по объявлениям, пока пользователь вошёл.
export function ConversationsRealtime() {
  const isSignedIn = useIsSignedIn()

  useConversationsRealtime(isSignedIn)

  return null
}
