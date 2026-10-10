import { FavoritesList } from '@/features/ads/components/favorites-list'
import { RequireSignIn } from '@/features/auth/components/require-sign-in'

import { TabScreen } from '@/shared/components/tab-screen'

export default function FavoritesRoute() {
  return (
    <RequireSignIn>
      <TabScreen>
        <FavoritesList />
      </TabScreen>
    </RequireSignIn>
  )
}
