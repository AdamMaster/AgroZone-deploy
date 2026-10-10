import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { BlockedUsersScreen } from '@/features/messages/components/blocked-users-screen'

import { TabScreen } from '@/shared/components/tab-screen'

export default function BlockedUsersRoute() {
  return (
    <RequireSignIn>
      <TabScreen>
        <BlockedUsersScreen />
      </TabScreen>
    </RequireSignIn>
  )
}
