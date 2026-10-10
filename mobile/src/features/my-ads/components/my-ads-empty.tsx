import { Image } from 'expo-image'
import { Text, View } from 'react-native'

import { Button } from '@/shared/components/button'
import { Heading } from '@/shared/components/heading'

const EMPTY_BOX = require('@/assets/images/illustrations/empty-box.png')

// Ещё ни одного объявления — как пустое состояние ContentAds сайта.
export function MyAdsEmpty({ onCreateAd }: { onCreateAd: () => void }) {
  return (
    <View className='items-center pt-12'>
      <Heading level={3} className='mb-2 text-center font-semibold'>
        У вас нет объявлений
      </Heading>
      <Text className='mb-4 text-center text-[15px] leading-5 text-gray-500'>
        Разместите первое объявление{'\n'}и найдите покупателей по всей России.
      </Text>
      <View className='mb-8'>
        <Button size='sm' title='Разместить объявление' onPress={onCreateAd} />
      </View>
      <Image source={EMPTY_BOX} style={{ width: 250, height: 250 }} accessibilityLabel='Нет объявлений' />
    </View>
  )
}
