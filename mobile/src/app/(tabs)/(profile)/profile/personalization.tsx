import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { ProfilePersonalizationScreen } from '@/features/profile/components/profile-personalization-screen'

import { TabScreen } from '@/shared/components/tab-screen'

export default function ProfilePersonalizationRoute() {
  return (
    <RequireSignIn>
      <TabScreen>
        <ProfilePersonalizationScreen />
      </TabScreen>
    </RequireSignIn>
  )
}
