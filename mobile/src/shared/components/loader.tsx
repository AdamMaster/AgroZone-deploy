import { ActivityIndicator, View } from 'react-native'

// Индикатор загрузки на месте содержимого экрана или раздела.
export function Loader() {
  return (
    <View className='items-center py-16'>
      <ActivityIndicator colorClassName='accent-primary' />
    </View>
  )
}
