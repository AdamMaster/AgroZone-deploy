import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { MessagesScreen } from '@/features/messages/components/messages-screen'

import { TabScreen } from '@/shared/components/tab-screen'

export default function MessagesRoute() {
  return (
    <RequireSignIn>
      <TabScreen>
        <MessagesScreen />
      </TabScreen>
    </RequireSignIn>
  )
}
