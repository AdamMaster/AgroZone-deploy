import { Text, View } from 'react-native'

import { CircleAlert } from '@/shared/icons/lucide'

// Причина отклонения модератором — как RejectionReason сайта.
export function RejectionReason({ text }: { text: string }) {
  return (
    <View className='flex-row items-center gap-2 self-start rounded-lg bg-red-100 px-3 py-2 dark:bg-red-500/20'>
      <CircleAlert size={16} color='#fb2c36' />
      <Text className='shrink text-sm text-red-500'>{text}</Text>
    </View>
  )
}
