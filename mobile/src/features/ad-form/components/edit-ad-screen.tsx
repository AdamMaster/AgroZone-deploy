import { useRouter } from 'expo-router'
import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ScreenMessage } from '@/shared/components/screen-message'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ArrowLeft } from '@/shared/icons/lucide'

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
  const router = useRouter()
  const { top } = useSafeAreaInsets()
  const iconColor = useThemeColor('--color-gray-900')

  return (
    <View className='flex-1 bg-background' style={{ paddingTop: top }}>
      <View className='h-12 flex-row items-center px-4'>
        <Pressable
          accessibilityRole='button'
          accessibilityLabel='Назад'
          onPress={() => router.back()}
          className='-ml-2 size-10 items-center justify-center rounded-lg active:bg-gray-100'
        >
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
      </View>
      {children}
    </View>
  )
}
