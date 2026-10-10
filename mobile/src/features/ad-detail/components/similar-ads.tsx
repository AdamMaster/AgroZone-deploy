import { useCallback } from 'react'
import { FlatList, type ListRenderItem, View } from 'react-native'

import { AdCard } from '@/features/ads/components/ad-card'
import { useSimilarAds } from '@/features/ads/hooks/use-ad-detail'
import { useToggleFavorite } from '@/features/ads/hooks/use-toggle-favorite'
import type { AdDetail } from '@/features/ads/types/ad-detail.types'
import type { AdListItem } from '@/features/ads/types/ad.types'

import { Heading } from '@/shared/components/heading'

// Ширина карточки и зазор — как у SimilarAdsSection сайта на телефоне.
const CARD_WIDTH = 196
const CARD_GAP = 4

const Separator = () => <View style={{ width: CARD_GAP }} />

// «Похожие объявления» — та же категория, лента вбок.
export function SimilarAds({ ad, onOpenAd }: { ad: AdDetail; onOpenAd: (ad: AdListItem) => void }) {
  const { data: ads } = useSimilarAds(ad)
  const { toggleFavorite, isPending, pendingAdId } = useToggleFavorite()

  const handleToggleFavorite = useCallback(
    (item: AdListItem) => toggleFavorite({ adId: item.id, isFavorite: !!item.isFavorite }),
    [toggleFavorite]
  )

  const renderItem: ListRenderItem<AdListItem> = ({ item }) => (
    <View style={{ width: CARD_WIDTH }}>
      <AdCard
        ad={item}
        onOpen={onOpenAd}
        onToggleFavorite={handleToggleFavorite}
        isFavoritePending={isPending && pendingAdId === item.id}
      />
    </View>
  )

  if (!ads?.length) return null

  return (
    <View className='mt-12'>
      <Heading level={2} className='mb-3'>
        Похожие объявления
      </Heading>
      <FlatList
        data={ads}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate='fast'
        ItemSeparatorComponent={Separator}
        // Лента выходит за поля экрана, как прокрутка у сайта.
        style={{ marginHorizontal: -16 }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      />
    </View>
  )
}
