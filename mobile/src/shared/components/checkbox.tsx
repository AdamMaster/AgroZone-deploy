import type { ReactNode } from 'react'
import { Pressable, Text, View } from 'react-native'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  // Подпись может содержать ссылки — поэтому ReactNode, а не строка.
  label: ReactNode
  accessibilityLabel: string
  error?: string
}

export function Checkbox({ checked, onChange, label, accessibilityLabel, error }: CheckboxProps) {
  return (
    <View className='gap-1.5'>
      <Pressable
        accessibilityRole='checkbox'
        accessibilityState={{ checked }}
        accessibilityLabel={accessibilityLabel}
        onPress={() => onChange(!checked)}
        className='flex-row items-start gap-3'
        hitSlop={4}
      >
        <View
          className={`mt-0.5 size-5 items-center justify-center rounded-md border ${
            checked ? 'border-primary bg-primary' : error ? 'border-destructive' : 'border-border'
          }`}
        >
          {checked && <Text className='text-xs font-bold text-white'>✓</Text>}
        </View>
        <View className='flex-1'>{label}</View>
      </Pressable>
      {error && <Text className='text-sm text-destructive'>{error}</Text>}
    </View>
  )
}
