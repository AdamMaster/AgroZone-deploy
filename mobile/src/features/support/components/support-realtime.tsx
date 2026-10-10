import { useProfile } from '@/features/auth/hooks/use-profile'

import { useSupportRealtime } from '../hooks/use-support-realtime'

// Живое соединение с чатом поддержки, пока пользователь вошёл, — как
// SupportChatWidget в корневом layout сайта: ответ поддержки отмечается
// точкой на вкладке «Сообщения», где бы пользователь ни был. У
// администратора свой инбокс обращений (на сайте) — ему соединение не нужно.
export function SupportRealtime() {
  const { data: profile } = useProfile()

  useSupportRealtime(!!profile && profile.role !== 'ADMIN')

  return null
}
