import { useLocalSearchParams } from 'expo-router'

import { SellerScreen } from '@/features/sellers/components/seller-screen'

import { TabScreen } from '@/shared/components/tab-screen'

export default function SellerRoute() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <TabScreen>
      {/* Другой продавец (из объявления в его ленте) — страница с чистого листа. */}
      <SellerScreen key={id} id={id} />
    </TabScreen>
  )
}
