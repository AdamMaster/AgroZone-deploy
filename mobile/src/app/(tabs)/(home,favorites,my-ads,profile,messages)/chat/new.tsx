import { useLocalSearchParams } from 'expo-router'

import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { NewConversationScreen } from '@/features/messages/components/new-conversation-screen'

import { TabScreen } from '@/shared/components/tab-screen'

// Новый диалог по объявлению: /chat/new?adId=… («Написать»).
export default function NewConversationRoute() {
  const { adId } = useLocalSearchParams<{ adId: string }>()

  return (
    <RequireSignIn>
      <TabScreen>
        <NewConversationScreen key={adId} adId={adId} />
      </TabScreen>
    </RequireSignIn>
  )
}
