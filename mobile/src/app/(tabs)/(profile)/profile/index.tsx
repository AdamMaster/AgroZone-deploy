import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { ProfileGeneralScreen } from '@/features/profile/components/profile-general-screen'

import { TabScreen } from '@/shared/components/tab-screen'

export default function ProfileGeneralRoute() {
  return (
    <RequireSignIn>
      <TabScreen>
        <ProfileGeneralScreen />
      </TabScreen>
    </RequireSignIn>
  )
}
