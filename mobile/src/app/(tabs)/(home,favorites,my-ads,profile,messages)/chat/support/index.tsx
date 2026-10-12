import { RequireSignIn } from '@/features/auth/components/require-sign-in'
import { SupportEntryScreen } from '@/features/support/components/support-entry-screen'

import { TabScreen } from '@/shared/components/tab-screen'

export default function SupportChatRoute() {
  return (
    <RequireSignIn>
      <TabScreen>
        <SupportEntryScreen />
      </TabScreen>
    </RequireSignIn>
  )
}
