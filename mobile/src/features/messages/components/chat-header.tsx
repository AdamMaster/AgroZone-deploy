import { useRouter } from 'expo-router'
import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

import { useAdNavigation } from '@/features/ads/hooks/use-ad-navigation'

import { AdPhoto } from '@/shared/components/ad-photo'
import { Avatar } from '@/shared/components/avatar'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ArrowLeft, ImageIcon } from '@/shared/icons/lucide'

import type { ConversationAd } from '../types/message.types'

interface ChatHeaderCounterpart {
  id: string
  displayName: string | null
  picture: string | null
  deletedAt?: string | null
}

interface ChatHeaderProps {
  counterpart?: ChatHeaderCounterpart
  ad?: ConversationAd
  isLoading?: boolean
  // Своя картинка вместо аватара собеседника (чат поддержки).
  avatar?: ReactNode
}

// Шапка переписки — как ChatHeader сайта: «назад», собеседник и
// объявление, по которому идёт разговор (нажатие открывает его).
export function ChatHeader({ counterpart, ad, isLoading = false, avatar }: ChatHeaderProps) {
  const router = useRouter()
  const { openAd } = useAdNavigation()
  const iconColor = useThemeColor('--color-gray-900')
  const mutedColor = useThemeColor('--color-gray-500')
  const isDeleted = !!counterpart?.deletedAt
  const name = isDeleted
    ? 'Пользователь удалил аккаунт'
    : (counterpart?.displayName ?? (isLoading ? 'Загрузка...' : 'Пользователь'))
  const adId = ad?.id

  return (
    <View className='flex-row items-center gap-3 rounded-lg bg-gray-100 px-3 py-3'>
      <Pressable
        accessibilityRole='button'
        accessibilityLabel='Назад к диалогам'
        onPress={() => router.back()}
        className='size-10 items-center justify-center rounded-lg active:bg-gray-200'
      >
        <ArrowLeft size={20} color={iconColor} />
      </Pressable>

      {avatar ?? (
        <Avatar
          name={counterpart?.displayName ?? null}
          pictureUrl={counterpart?.picture ?? null}
          colorSeed={counterpart?.id}
          size='base'
        />
      )}

      <View className='min-w-0 flex-1'>
        <Text
          numberOfLines={1}
          className={`text-sm font-medium ${isDeleted ? 'text-gray-400 italic' : 'text-gray-900'}`}
        >
          {name}
        </Text>

        {ad && (
          <Pressable
            accessibilityRole={adId ? 'link' : 'text'}
            disabled={!adId}
            onPress={() => adId && openAd(adId)}
            className='flex-row items-center gap-1.5'
          >
            {ad.images[0] ? (
              <View className='size-4 overflow-hidden rounded'>
                <AdPhoto url={ad.images[0]} size={400} className='size-full' contentFit='cover' />
              </View>
            ) : (
              <ImageIcon size={14} color={mutedColor} />
            )}
            <Text numberOfLines={1} className={`flex-1 text-xs ${adId ? 'text-gray-500' : 'text-gray-400'}`}>
              {ad.title}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  )
}
