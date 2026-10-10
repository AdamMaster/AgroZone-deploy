import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { ProfilePremiumScreen } from '@/features/profile/components/profile-premium-screen'

import { TabScreen } from '@/shared/components/tab-screen'

export default function ProfilePremiumRoute() {
  return (
    <RequireSignIn>
      <TabScreen>
        <ProfilePremiumScreen />
      </TabScreen>
    </RequireSignIn>
  )
}
