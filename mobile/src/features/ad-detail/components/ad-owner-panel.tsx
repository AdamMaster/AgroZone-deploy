import { View } from 'react-native'

import type { AdCounters, AdDetail } from '@/features/ads/types/ad-detail.types'

import { Button } from '@/shared/components/button'

import { AdCountersPanel } from './ad-counters-panel'
import { AdStatusBanner } from './ad-status-banner'

export type OwnerStatusAction = 'activate' | 'republish' | 'archive'

interface AdOwnerPanelProps {
  ad: AdDetail
  counters: AdCounters | undefined
  pendingAction: string | undefined
  onStatusAction: (action: OwnerStatusAction) => void
  onRemove: () => void
  onPromote: () => void
  onOpenStats: () => void
}

// Опубликованное и на модерации удалить нельзя — сначала снять с
// публикации (isAdRemovable сайта и проверка на сервере).
const isRemovable = (status: AdDetail['status']) => status !== 'PUBLISHED' && status !== 'PENDING'

// Блок владельца над фото — как на сайте на телефоне: у неопубликованного
// плашка статуса и доступные действия, у опубликованного — «Поднять» и
// «Снять с публикации»; ниже — просмотры и избранное.
export function AdOwnerPanel({
  ad,
  counters,
  pendingAction,
  onStatusAction,
  onRemove,
  onPromote,
  onOpenStats
}: AdOwnerPanelProps) {
  const isBusy = pendingAction !== undefined

  if (ad.status !== 'PUBLISHED') {
    return (
      <View className='mb-6'>
        <AdStatusBanner status={ad.status} rejectionReason={ad.rejectionReason} />
        <View className='mt-3 gap-1'>
          {(ad.status === 'DRAFT' || ad.status === 'ARCHIVED') && (
            <Button
              title='Опубликовать'
              isLoading={pendingAction === 'activate'}
              disabled={isBusy}
              onPress={() => onStatusAction('activate')}
            />
          )}
          {ad.status === 'EXPIRED' && (
            <Button
              title='Опубликовать снова'
              isLoading={pendingAction === 'republish'}
              disabled={isBusy}
              onPress={() => onStatusAction('republish')}
            />
          )}
          {ad.status === 'PENDING' && (
            <Button
              variant='secondary'
              title='Снять с публикации'
              isLoading={pendingAction === 'archive'}
              disabled={isBusy}
              onPress={() => onStatusAction('archive')}
            />
          )}
          {isRemovable(ad.status) && (
            <Button variant='destructive-soft' title='Удалить' disabled={isBusy} onPress={onRemove} />
          )}
        </View>
        {counters && (
          <View className='mt-3'>
            <AdCountersPanel counters={counters} onOpenStats={onOpenStats} />
          </View>
        )}
      </View>
    )
  }

  return (
    <View>
      <View className='mb-3 gap-1'>
        <Button title='Поднять объявление' disabled={isBusy} onPress={onPromote} />
        <Button
          variant='secondary'
          title='Снять с публикации'
          isLoading={pendingAction === 'archive'}
          disabled={isBusy}
          onPress={() => onStatusAction('archive')}
        />
      </View>
      {counters && <AdCountersPanel counters={counters} onOpenStats={onOpenStats} />}
    </View>
  )
}
