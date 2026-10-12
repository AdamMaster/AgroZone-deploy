import { useProfile } from '@/features/auth/hooks/use-profile'

import { useSupportRealtime } from '../hooks/use-support-realtime'

// Живое соединение с чатом поддержки, пока пользователь вошёл, — как
// SupportChatWidget в корневом layout сайта: ответ поддержки (а
// администратору — новое обращение) отмечается точкой на вкладке
// «Сообщения», где бы он ни был.
export function SupportRealtime() {
  const { data: profile } = useProfile()

  useSupportRealtime(!!profile, profile?.role === 'ADMIN')

  return null
}
