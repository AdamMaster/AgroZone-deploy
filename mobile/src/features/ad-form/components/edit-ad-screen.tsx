import type { ReactNode } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { BackButton } from '@/shared/components/back-button'
import { ScreenMessage } from '@/shared/components/screen-message'

import { useEditableAd } from '../hooks/use-ad-form-mutations'
import { AdForm } from './ad-form'

// Правка объявления — AdEdit сайта: форма начинается с объявления как оно
// есть сейчас на сервере.
export function EditAdScreen({ id }: { id: string }) {
  const { data: ad, error, refetch } = useEditableAd(id)

  if (ad) return <AdForm mode='edit' ad={ad} />

  return (
    <LoadingFrame>
      {error ? (
        <ScreenMessage
          title='Не удалось загрузить объявление'
          description={error.message}
          action={{ title: 'Повторить', onPress: () => void refetch() }}
        />
      ) : (
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator colorClassName='accent-primary' />
        </View>
      )}
    </LoadingFrame>
  )
}

function LoadingFrame({ children }: { children: ReactNode }) {
  const { top } = useSafeAreaInsets()

  return (
    <View className='flex-1 bg-background' style={{ paddingTop: top }}>
      <View className='h-13 flex-row items-center'>
        <BackButton />
      </View>
      {children}
    </View>
  )
}
