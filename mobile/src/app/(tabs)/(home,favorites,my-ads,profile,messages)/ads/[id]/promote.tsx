import { useLocalSearchParams } from 'expo-router'

import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { PromoteAdScreen } from '@/features/promote-ad/components/promote-ad-screen'

import { TabScreen } from '@/shared/components/tab-screen'

export default function AdPromoteRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <RequireSignIn>
      <TabScreen>
        <PromoteAdScreen id={id} />
      </TabScreen>
    </RequireSignIn>
  )
}
