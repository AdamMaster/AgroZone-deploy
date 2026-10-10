import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { ProfileOverview } from '@/features/profile/components/profile-overview'

import { TabScreen } from '@/shared/components/tab-screen'

export default function ProfileRoute() {
  return (
    <RequireSignIn>
      <TabScreen>
        <ProfileOverview />
      </TabScreen>
    </RequireSignIn>
  )
}
