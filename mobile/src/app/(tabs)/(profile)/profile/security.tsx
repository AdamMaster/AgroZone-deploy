import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { ProfileSecurityScreen } from '@/features/profile/components/profile-security-screen'

import { TabScreen } from '@/shared/components/tab-screen'

export default function ProfileSecurityRoute() {
  return (
    <RequireSignIn>
      <TabScreen>
        <ProfileSecurityScreen />
      </TabScreen>
    </RequireSignIn>
  )
}
