import { useLocalSearchParams } from 'expo-router'

import { AdStatsScreen } from '@/features/ad-detail/components/ad-stats-screen'
import { RequireSignIn } from '@/features/auth/components/require-sign-in'

import { TabScreen } from '@/shared/components/tab-screen'

export default function AdStatsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <RequireSignIn>
      <TabScreen>
        <AdStatsScreen id={id} />
      </TabScreen>
    </RequireSignIn>
  )
}
