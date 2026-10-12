import { useLocalSearchParams } from 'expo-router'

import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { SupportAdminThreadScreen } from '@/features/support/components/support-admin-thread-screen'

import { TabScreen } from '@/shared/components/tab-screen'

// Обращение из списка поддержки — только для администратора (список другим
// не показывается, сервер отказывает по ролям).
export default function SupportConversationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <RequireSignIn>
      <TabScreen>
        <SupportAdminThreadScreen key={id} conversationId={id} />
      </TabScreen>
    </RequireSignIn>
  )
}
