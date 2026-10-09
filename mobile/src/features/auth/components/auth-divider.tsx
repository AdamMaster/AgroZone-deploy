import { Text, View } from 'react-native'

export function AuthDivider() {
  return (
    <View className='flex-row items-center gap-3'>
      <View className='h-px flex-1 bg-border' />
      <Text className='text-sm text-muted-foreground'>или</Text>
      <View className='h-px flex-1 bg-border' />
    </View>
  )
}
