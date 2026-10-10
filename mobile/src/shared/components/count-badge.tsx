import { Text, View } from 'react-native'

interface CountBadgeProps {
  count: number
}

// Зелёный кружок с числом в углу иконки (непрочитанные уведомления) — как
// на сайте: больше девяти — «9+». Ставится внутрь relative-обёртки иконки.
export function CountBadge({ count }: CountBadgeProps) {
  if (count <= 0) return null

  return (
    <View
      pointerEvents='none'
      className='absolute -top-1 -right-2 h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1'
    >
      <Text className='text-[10px] font-medium text-white'>{count > 9 ? '9+' : count}</Text>
    </View>
  )
}
