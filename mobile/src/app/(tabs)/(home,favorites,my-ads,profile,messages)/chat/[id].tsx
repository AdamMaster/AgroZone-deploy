import { useLocalSearchParams } from 'expo-router'

import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { ConversationChatScreen } from '@/features/messages/components/conversation-chat-screen'

import { TabScreen } from '@/shared/components/tab-screen'

export default function ConversationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <RequireSignIn>
      <TabScreen>
        <ConversationChatScreen key={id} conversationId={id} />
      </TabScreen>
    </RequireSignIn>
  )
}
