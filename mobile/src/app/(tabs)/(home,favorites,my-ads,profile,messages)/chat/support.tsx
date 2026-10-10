import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { SupportChatScreen } from '@/features/support/components/support-chat-screen'

import { TabScreen } from '@/shared/components/tab-screen'

export default function SupportChatRoute() {
  return (
    <RequireSignIn>
      <TabScreen>
        <SupportChatScreen />
      </TabScreen>
    </RequireSignIn>
  )
}
