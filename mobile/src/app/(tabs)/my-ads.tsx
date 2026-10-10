import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { MyAdsScreen } from '@/features/my-ads/components/my-ads-screen'

import { TabScreen } from '@/shared/components/tab-screen'

export default function MyAdsRoute() {
  return (
    <RequireSignIn>
      <TabScreen>
        <MyAdsScreen />
      </TabScreen>
    </RequireSignIn>
  )
}
