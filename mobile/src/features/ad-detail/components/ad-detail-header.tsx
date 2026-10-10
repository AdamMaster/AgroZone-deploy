import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { ActionSheet, type SheetAction } from '@/shared/components/action-sheet'
import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { ArrowLeft, Ellipsis, Heart, SquarePen } from '@/shared/icons/lucide'

// Красный — как text-red-500 у сердечка сайта.
const FAVORITE_COLOR = '#fb2c36'

interface AdDetailHeaderProps {
  // Пока объявление грузится, справа ничего нет — только «Назад».
  mode: 'loading' | 'owner' | 'visitor'
  isFavorite?: boolean
  isFavoritePending?: boolean
  onToggleFavorite?: () => void
  onEdit?: () => void
  menuActions?: readonly SheetAction[]
}

function HeaderButton({
  label,
  onPress,
  disabled,
  children
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      className='size-13 items-center justify-center disabled:opacity-50'
    >
      {children}
    </Pressable>
  )
}

// Верхняя полоса страницы объявления — как на сайте на телефоне: «Назад»
// слева; справа у владельца «Редактировать» и меню, у остальных —
// «В избранное» и меню.
export function AdDetailHeader({
  mode,
  isFavorite = false,
  isFavoritePending = false,
  onToggleFavorite,
  onEdit,
  menuActions = []
}: AdDetailHeaderProps) {
  const router = useRouter()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const iconColor = useThemeColor('--color-gray-950')

  return (
    <View className='flex-row items-center justify-between bg-background'>
      {/* Открыли по ссылке и возвращаться некуда — на главную. */}
      <HeaderButton label='Назад' onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
        <ArrowLeft size={20} color={iconColor} />
      </HeaderButton>

      <View className='flex-row items-center'>
        {mode === 'owner' && onEdit && (
          <HeaderButton label='Редактировать объявление' onPress={onEdit}>
            <SquarePen size={20} color={iconColor} />
          </HeaderButton>
        )}
        {mode === 'visitor' && onToggleFavorite && (
          <HeaderButton
            label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
            onPress={onToggleFavorite}
            disabled={isFavoritePending}
          >
            <Heart
              size={20}
              color={isFavorite ? FAVORITE_COLOR : iconColor}
              fill={isFavorite ? FAVORITE_COLOR : 'transparent'}
            />
          </HeaderButton>
        )}
        {menuActions.length > 0 && (
          <HeaderButton label='Ещё' onPress={() => setIsMenuOpen(true)}>
            <Ellipsis size={20} color={iconColor} />
          </HeaderButton>
        )}
      </View>

      <ActionSheet visible={isMenuOpen} actions={menuActions} onClose={() => setIsMenuOpen(false)} />
    </View>
  )
}
