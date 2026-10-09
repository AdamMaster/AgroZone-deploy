import { Text, View } from 'react-native'

import { StyledImage } from './styled'

interface AvatarProps {
  name: string | null
  pictureUrl: string | null
  size: 'sm' | 'lg'
}

const SIZE_CLASSES = {
  sm: { container: 'size-8', text: 'text-sm' },
  lg: { container: 'size-20', text: 'text-3xl' }
} as const

// Фото профиля или, если его нет, первая буква имени на фирменном фоне.
export function Avatar({ name, pictureUrl, size }: AvatarProps) {
  const classes = SIZE_CLASSES[size]
  const initial = name?.trim().charAt(0).toUpperCase() || '?'

  return (
    <View className={`${classes.container} items-center justify-center overflow-hidden rounded-full bg-primary`}>
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
