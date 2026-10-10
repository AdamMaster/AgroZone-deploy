import { useRouter } from 'expo-router'
import { useState } from 'react'
import { RefreshControl, ScrollView, Share, Text, View } from 'react-native'
import { toast } from 'sonner-native'

import { SITE_URL } from '@/config/env'

import { type AdDetailView, useAdCounters, useAdDetail, useAdOwnerActions } from '@/features/ads/hooks/use-ad-detail'
import { useAdNavigation } from '@/features/ads/hooks/use-ad-navigation'
import { useToggleFavorite } from '@/features/ads/hooks/use-toggle-favorite'
import type { AdDetail } from '@/features/ads/types/ad-detail.types'
import type { AdListItem } from '@/features/ads/types/ad.types'
import { useProfile } from '@/features/auth/hooks/use-profile'
import { useAuthStore } from '@/features/auth/store/auth-store'

import type { SheetAction } from '@/shared/components/action-sheet'
import { ScreenMessage } from '@/shared/components/screen-message'
import { PRICE_UNITS, WHOLE_PRICE_UNIT } from '@/shared/constants/price-units'
import { useRefetchOnFocus } from '@/shared/hooks/use-refetch-on-focus'
import { isFutureDate } from '@/shared/utils/date'
import { formatPrice } from '@/shared/utils/format-price'
import { openSitePage } from '@/shared/utils/open-site-page'

import { ApiError } from '@/lib/api/api-error'

import { AdContactButtons } from './ad-contact-buttons'
import { AdDetailHeader } from './ad-detail-header'
import { AdGallery } from './ad-gallery'
import { AdInfoSections } from './ad-info-sections'
import { AdOwnerPanel, type OwnerStatusAction } from './ad-owner-panel'
import { AdSeller } from './ad-seller'
import { RemoveAdDialog } from './remove-ad-dialog'
import { ReportAdDialog } from './report-ad-dialog'
import { SimilarAds } from './similar-ads'

interface AdDetailScreenProps {
  id: string
  view: AdDetailView
  // Владелец сменил статус — дальше смотрим объявление как владелец:
  // публичная страница у неопубликованного объявления отдаёт 404.
  onSwitchToOwnerView: () => void
}

// Редактирование — этап с формой подачи объявления; до него честно говорим
// об этом.
const editAd = () => toast.info('Редактирование объявления появится в следующем обновлении приложения')

// Ссылка на объявление на сайте — ей делятся: у приложения своих адресов в
// интернете нет.
const shareAd = (ad: AdDetail) => {
  const url = `${SITE_URL}/ads/${ad.id}`
  void Share.share({ title: ad.title, message: `${ad.title}\n${url}`, url })
}

function AdDetailSkeleton() {
  return (
    <View className='px-4'>
      <View className='mb-3 w-full rounded-xl bg-gray-100' style={{ aspectRatio: 1 / 0.76 }} />
      <View className='mb-2 h-6 w-4/5 rounded-md bg-gray-100' />
      <View className='mb-6 h-7 w-1/3 rounded-md bg-gray-100' />
      <View className='h-13 w-full rounded-lg bg-gray-100' />
    </View>
  )
}

// Страница объявления — как AdDetail сайта на телефоне.
export function AdDetailScreen({ id, view, onSwitchToOwnerView }: AdDetailScreenProps) {
  const router = useRouter()
  const query = useAdDetail(id, view)
  const ad = query.data
  const { data: profile } = useProfile()
  const isSignedIn = useAuthStore(state => state.status === 'signedIn')
  const isOwner = !!ad && !!profile && ad.userId === profile.id
  const counters = useAdCounters(id, { enabled: isOwner })
  const ownerActions = useAdOwnerActions(id)
  const { toggleFavorite, isPending: isFavoritePending } = useToggleFavorite()
  const { openAd, openAdStats } = useAdNavigation()
  const [isRemoveDialogOpen, setIsRemoveDialogOpen] = useState(false)
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useRefetchOnFocus(query.refetch)

  if (!ad) {
    const isNotFound = query.error instanceof ApiError && query.error.statusCode === 404

    return (
      <View className='flex-1'>
        <AdDetailHeader mode='loading' />
        {query.isPending ? (
          <AdDetailSkeleton />
        ) : isNotFound ? (
          <ScreenMessage
            title='Объявление не найдено'
            description='Такого объявления нет на AgroZone — возможно, оно снято с публикации или срок его размещения истёк.'
          />
        ) : (
          <ScreenMessage
            title='Не удалось загрузить объявление'
            description={query.error?.message}
            action={{ title: 'Повторить', onPress: () => void query.refetch() }}
          />
        )}
      </View>
    )
  }

  const isPublished = ad.status === 'PUBLISHED'
  // Статистика есть, если объявление уже показывалось покупателям.
  const hasViewStats = isPublished || ad.status === 'ARCHIVED' || ad.status === 'EXPIRED'
  const isPriceHighlighted = isFutureDate(ad.priceHighlightUntil) || isFutureDate(ad.user?.premiumUntil)
  const badge = ad.badge && isFutureDate(ad.badgeUntil) ? ad.badge : null
  const unitLabel = ad.price && ad.unit !== WHOLE_PRICE_UNIT ? PRICE_UNITS[ad.unit] : undefined

  const changeStatus = (action: OwnerStatusAction | 'draft') =>
    ownerActions.changeStatus(action, { onSuccess: () => view === 'public' && onSwitchToOwnerView() })

  const menuActions: SheetAction[] = isOwner
    ? [
        ...(hasViewStats ? [{ key: 'stats', label: 'Статистика', onPress: () => openAdStats(ad.id) }] : []),
        ...(ad.status === 'REJECTED'
          ? [
              {
                key: 'draft',
                label: 'В черновик',
                onPress: () => changeStatus('draft'),
                isDisabled: ownerActions.pendingAction !== undefined
              }
            ]
          : []),
        ...(isPublished ? [{ key: 'share', label: 'Поделиться', onPress: () => shareAd(ad) }] : [])
      ]
    : [
        { key: 'share', label: 'Поделиться', onPress: () => shareAd(ad) },
        // Жаловаться можно только вошедшим — как на сайте.
        ...(isSignedIn
          ? [{ key: 'report', label: 'Пожаловаться', onPress: () => setIsReportDialogOpen(true), isDestructive: true }]
          : [])
      ]

  const refresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([query.refetch(), isOwner && counters.refetch()])
    } finally {
      setIsRefreshing(false)
    }
  }

  const confirmRemove = () =>
    ownerActions.remove(undefined, {
      onSuccess: () => {
        setIsRemoveDialogOpen(false)
        if (router.canGoBack()) router.back()
        else router.replace('/my-ads')
      }
    })

  return (
    <View className='flex-1'>
      <AdDetailHeader
        mode={isOwner ? 'owner' : 'visitor'}
        isFavorite={!!ad.isFavorite}
        isFavoritePending={isFavoritePending}
        onToggleFavorite={() => toggleFavorite({ adId: ad.id, isFavorite: !!ad.isFavorite })}
        onEdit={editAd}
        menuActions={menuActions}
      />

      <ScrollView
        contentContainerClassName='px-4 pt-4 pb-8'
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void refresh()}
            colorsClassName='accent-primary'
            tintColorClassName='accent-primary'
          />
        }
      >
        {isOwner && (
          <AdOwnerPanel
            ad={ad}
            counters={counters.data}
            pendingAction={ownerActions.pendingAction}
            onStatusAction={changeStatus}
            onRemove={() => setIsRemoveDialogOpen(true)}
            // Платные услуги пока оплачиваются на сайте.
            onPromote={() => void openSitePage(`/ads/${ad.id}/promote`)}
            onOpenStats={() => openAdStats(ad.id)}
          />
        )}

        <View className='mb-3'>
          <AdGallery images={ad.images} title={ad.title} badge={badge} />
        </View>

        <Text className='mb-2 text-lg leading-tight font-bold text-gray-900'>{ad.title}</Text>
        <View className='mb-4 items-start'>
          <Text
            className={`text-xl font-bold text-gray-950 ${
              isPriceHighlighted ? 'overflow-hidden rounded bg-amber-200 px-1.5 dark:text-neutral-900' : ''
            }`}
          >
            {formatPrice(ad.price)}
          </Text>
          {unitLabel && <Text className='text-sm text-gray-500'>за {unitLabel.toLowerCase()}</Text>}
        </View>

        {!isOwner && (
          <View className='mb-8'>
            <AdContactButtons adId={ad.id} />
          </View>
        )}

        {ad.user && <AdSeller seller={ad.user} publishedAt={ad.publishedAt} bumpedAt={ad.bumpedAt} />}

        <View className='mt-3'>
          <AdInfoSections
            address={ad.address}
            description={ad.description}
            categoryId={ad.categoryId}
            features={ad.features}
          />
        </View>

        <SimilarAds ad={ad} onOpenAd={(item: AdListItem) => openAd(item.id)} />
      </ScrollView>

      {isOwner && (
        <RemoveAdDialog
          visible={isRemoveDialogOpen}
          adTitle={ad.title}
          isRemoving={ownerActions.isRemoving}
          onConfirm={confirmRemove}
          onClose={() => setIsRemoveDialogOpen(false)}
        />
      )}
      {!isOwner && isSignedIn && (
        <ReportAdDialog adId={ad.id} visible={isReportDialogOpen} onClose={() => setIsReportDialogOpen(false)} />
      )}
    </View>
  )
}
