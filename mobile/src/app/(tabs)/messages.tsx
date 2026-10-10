import { RequireSignIn } from '@/features/auth/components/require-sign-in'

import { ScreenMessage } from '@/shared/components/screen-message'
import { TabScreen } from '@/shared/components/tab-screen'

// Сообщения — появятся вместе с чатом; вкладка уже на своём месте, как на сайте.
export default function MessagesRoute() {
  return (
    <RequireSignIn>
      <TabScreen>
        <ScreenMessage title='Сообщения' description='Раздел появится в следующем обновлении приложения' />
      </TabScreen>
    </RequireSignIn>
  )
}
