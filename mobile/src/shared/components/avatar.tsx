import { Text, View } from 'react-native'

import { getAvatarColor } from '@/shared/utils/avatar-color'

import { StyledImage } from './styled'

interface AvatarProps {
  name: string | null
  pictureUrl: string | null
  size: 'sm' | 'md' | 'lg'
  // id пользователя: без фото фон — его цвет, как у UserAvatar сайта. Без
  // него — фирменный зелёный (свой профиль).
  colorSeed?: string
}

const SIZE_CLASSES = {
  sm: { container: 'size-8', text: 'text-sm' },
  md: { container: 'size-12', text: 'text-lg' },
  lg: { container: 'size-20', text: 'text-3xl' }
} as const

// Фото профиля или, если его нет, первая буква имени на цветном фоне.
export function Avatar({ name, pictureUrl, size, colorSeed }: AvatarProps) {
  const classes = SIZE_CLASSES[size]
  const initial = name?.trim().charAt(0).toUpperCase() || '?'

  return (
    <View
      className={`${classes.container} items-center justify-center overflow-hidden rounded-full ${colorSeed ? '' : 'bg-primary'}`}
      style={colorSeed ? { backgroundColor: getAvatarColor(colorSeed) } : undefined}
    >
      {pictureUrl ? (
        <StyledImage
          source={{ uri: pictureUrl }}
          className='size-full'
          contentFit='cover'
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Text className={`${classes.text} font-semibold text-white`}>{initial}</Text>
      )}
    </View>
  )
}
