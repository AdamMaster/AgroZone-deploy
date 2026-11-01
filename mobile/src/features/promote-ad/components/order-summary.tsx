import { Text, View } from 'react-native'

import { Button } from '@/shared/components/button'
import { formatRubles } from '@/shared/utils/format-price'

interface OrderSummaryProps {
  totalKopecks: number
  canPay: boolean
  isPaying: boolean
  onPay: () => void
}

// Блок «Итого» с кнопкой оплаты — как на странице сайта.
export function OrderSummary({ totalKopecks, canPay, isPaying, onPay }: OrderSummaryProps) {
  return (
    <View className='rounded-xl bg-gray-100 p-4'>
      <Text className='text-sm text-gray-500'>Итого</Text>
      <Text className='mb-3 text-xl font-bold text-gray-900'>{formatRubles(totalKopecks / 100)}</Text>
      <Button title='Оплатить' isLoading={isPaying} disabled={!canPay} onPress={onPay} />
    </View>
  )
}
