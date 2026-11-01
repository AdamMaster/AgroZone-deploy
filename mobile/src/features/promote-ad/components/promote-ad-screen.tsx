import { useRouter } from 'expo-router'
import { ScrollView, Text, View } from 'react-native'

import { useAdDetail } from '@/features/ads/hooks/use-ad-detail'
import { getActiveBadge } from '@/features/ads/lib/ad-promotion'
import { useProfile } from '@/features/auth/hooks/use-profile'

import { AppRefreshControl } from '@/shared/components/app-refresh-control'
import { BackButton } from '@/shared/components/back-button'
import { Heading } from '@/shared/components/heading'
import { Loader } from '@/shared/components/loader'
import { ScreenMessage } from '@/shared/components/screen-message'
import { isFutureDate } from '@/shared/utils/date'

import { AD_SERVICES, AD_SERVICE_DURATION_DAYS, PREMIUM_COVERED_SERVICES } from '../constants/ad-services'
import { useAdServicesCheckout } from '../hooks/use-ad-services-checkout'
import { usePromoteAdForm } from '../hooks/use-promote-ad-form'
import type { AdServiceType } from '../types/promote-ad.types'
import { AdPreviewCard } from './ad-preview-card'
import { OrderSummary } from './order-summary'
import { ServiceCard } from './service-card'

// «Поднять просмотры» — как PromoteAd сайта: выбор услуг продвижения
// объявления (поднятие, выделение цены, значок), превью карточки с ними и
// оплата одним платежом. Оплата идёт прямо из приложения.
export function PromoteAdScreen({ id }: { id: string }) {
  const router = useRouter()
  // Страница владельца: объявление в любом статусе, чужое сервер не отдаст.
  const query = useAdDetail(id, 'owner')
  const { data: profile } = useProfile()
  const ad = query.data
  const form = usePromoteAdForm(ad?.badge)
  const checkout = useAdServicesCheckout(id)

  const isOwnerPremium = isFutureDate(profile?.premiumUntil)

  const pay = () => {
    if (!form.isComplete || checkout.isPending) return

    // Услуги подключены — возвращаемся на страницу объявления, как сайт.
    checkout.mutate(form.params, {
      onSuccess: status => {
        if (status === 'SUCCEEDED') router.back()
      }
    })
  }

  const renderContent = () => {
    if (!ad) {
      return query.isPending ? (
        <Loader />
      ) : (
        <ScreenMessage
          title='Не удалось загрузить объявление'
          description={query.error?.message}
          action={{ title: 'Повторить', onPress: () => void query.refetch() }}
        />
      )
    }

    if (ad.status !== 'PUBLISHED') {
      return (
        <ScreenMessage
          title='Услуги продвижения недоступны'
          description='Продвигать можно только опубликованные объявления. Сначала опубликуйте объявление, затем возвращайтесь сюда.'
          action={{ title: 'К объявлению', onPress: () => router.back() }}
        />
      )
    }

    const activeUntil: Record<AdServiceType, string | null> = {
      BUMP: ad.bumpServiceUntil,
      PRICE_HIGHLIGHT: ad.priceHighlightUntil,
      BADGE: ad.badgeUntil
    }

    return (
      <View className='gap-8'>
        <View className='gap-3'>
          {AD_SERVICES.map(service => (
            <ServiceCard
              key={service}
              service={service}
              isChecked={form.selected.has(service)}
              isIncludedInPremium={isOwnerPremium && PREMIUM_COVERED_SERVICES.includes(service)}
              activeUntil={activeUntil[service]}
              activeBadge={ad.badge}
              selectedBadge={form.selectedBadge}
              onToggle={() => form.toggle(service)}
              onSelectBadge={form.setSelectedBadge}
            />
          ))}
        </View>

        <View className='gap-4'>
          <AdPreviewCard
            photoUrl={ad.images[0]}
            // Выбранный значок показываем сразу; иначе — тот, что ещё действует.
            badge={form.selected.has('BADGE') ? form.selectedBadge : (getActiveBadge(ad) ?? undefined)}
            price={ad.price}
            isPriceHighlighted={
              form.selected.has('PRICE_HIGHLIGHT') || isFutureDate(ad.priceHighlightUntil) || isOwnerPremium
            }
            isBumped={form.selected.has('BUMP') || isFutureDate(ad.bumpServiceUntil) || isOwnerPremium}
          />
          <OrderSummary
            totalKopecks={form.totalKopecks}
            canPay={form.isComplete}
            isPaying={checkout.isPending}
            onPay={pay}
          />
        </View>
      </View>
    )
  }

  return (
    <ScrollView
      contentContainerClassName='px-4 pb-8'
      keyboardShouldPersistTaps='handled'
      refreshControl={<AppRefreshControl onRefresh={() => query.refetch()} />}
    >
      <View className='-mx-4 mb-1 flex-row items-center gap-3'>
        <BackButton />
        <Heading level={2}>Поднять просмотры</Heading>
      </View>
      <Text className='mb-6 text-sm text-gray-500'>
        Выберите нужные услуги — они действуют {AD_SERVICE_DURATION_DAYS} дней, оплата одним платежом за весь выбранный
        набор.
      </Text>

      {renderContent()}
    </ScrollView>
  )
}
