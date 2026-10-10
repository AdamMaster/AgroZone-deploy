import { View } from 'react-native'

import { Headset } from '@/shared/icons/lucide'

// Значок «Поддержки AgroZone» вместо аватара собеседника — как SupportAvatar
// сайта.
export function SupportAvatar() {
  return (
    <View className='size-10 items-center justify-center rounded-full bg-primary'>
      <Headset size={20} color='#ffffff' />
    </View>
  )
}
