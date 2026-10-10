import { useLocalSearchParams, useRouter } from 'expo-router'

import { AdDetailScreen } from '@/features/ad-detail/components/ad-detail-screen'

import { TabScreen } from '@/shared/components/tab-screen'

// view=owner — страница владельца (объявление в любом статусе), как
// /ads/:id/my сайта; без него — публичная страница.
type AdParams = { id: string; view?: string }

export default function AdRoute() {
  const router = useRouter()
  const { id, view } = useLocalSearchParams<AdParams>()

  return (
    <TabScreen>
      <AdDetailScreen
        // Новое объявление (переход из «Похожих») — новая страница, без
        // состояния предыдущей (открытое фото, показанный телефон).
        key={id}
        id={id}
        view={view === 'owner' ? 'owner' : 'public'}
        onSwitchToOwnerView={() => router.setParams({ view: 'owner' })}
      />
    </TabScreen>
  )
}
