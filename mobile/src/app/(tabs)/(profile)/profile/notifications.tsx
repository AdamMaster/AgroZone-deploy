import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { ProfileNotificationsScreen } from '@/features/profile/components/profile-notifications-screen'

import { TabScreen } from '@/shared/components/tab-screen'

export default function ProfileNotificationsRoute() {
  return (
    <RequireSignIn>
      <TabScreen>
        <ProfileNotificationsScreen />
      </TabScreen>
    </RequireSignIn>
  )
}
