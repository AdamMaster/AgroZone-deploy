import type { PropsWithChildren } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native'

// Экран с формой: прокручивается и поднимает содержимое над клавиатурой,
// чтобы поле ввода и кнопка не прятались под ней. На Android с
// edge-to-edge это делает сама система, поэтому сдвиг нужен только на iOS.
export function FormScreen({ children }: PropsWithChildren) {
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className='flex-1 bg-background'>
      <ScrollView
        keyboardShouldPersistTaps='handled'
        contentInsetAdjustmentBehavior='automatic'
        contentContainerClassName='p-5 pb-10'
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
