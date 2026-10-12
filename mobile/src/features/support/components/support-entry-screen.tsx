import { useProfile } from '@/features/auth/hooks/use-profile'

import { SupportAdminInboxScreen } from './support-admin-inbox-screen'
import { SupportChatScreen } from './support-chat-screen'

// «Поддержка» в сообщениях: у пользователя — его чат с поддержкой, у
// администратора — список обращений (на сайте так же выбирает messages-client).
export function SupportEntryScreen() {
  const { data: profile } = useProfile()

  if (!profile) return null

  return profile.role === 'ADMIN' ? <SupportAdminInboxScreen /> : <SupportChatScreen />
}
