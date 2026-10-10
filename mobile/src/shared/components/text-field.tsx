import { forwardRef, useState } from 'react'
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Eye, EyeOff } from '@/shared/icons/lucide'

interface TextFieldProps extends Omit<TextInputProps, 'style' | 'secureTextEntry'> {
  label: string
  error?: string
  // Поле пароля: скрывает ввод, справа — глазик, как PasswordToggle сайта.
  isPassword?: boolean
}

// Поле ввода формы: подпись, само поле, текст ошибки под ним. Высота поля 48 —
// удобная зона нажатия для пальца.
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, isPassword = false, ...inputProps },
  ref
) {
  const [isSecure, setIsSecure] = useState(isPassword)
  const toggleIconColor = useThemeColor('--color-muted-foreground')

  return (
    <View className='gap-1.5'>
      <Text className='text-sm font-medium text-foreground'>{label}</Text>
      <View
        className={`h-12 flex-row items-center rounded-xl border bg-muted ${error ? 'border-destructive' : 'border-border'}`}
      >
        <TextInput
          ref={ref}
          className='h-full flex-1 px-4 text-base text-foreground'
          placeholderTextColorClassName='accent-muted-foreground'
          secureTextEntry={isSecure}
          accessibilityLabel={label}
          {...inputProps}
        />
        {isPassword && (
          <Pressable
            accessibilityRole='button'
            accessibilityLabel={isSecure ? 'Показать пароль' : 'Скрыть пароль'}
            onPress={() => setIsSecure(value => !value)}
            className='h-full justify-center px-3.5'
            hitSlop={8}
          >
            {/* Как на сайте: пароль скрыт — перечёркнутый глаз, виден — открытый. */}
            {isSecure ? <EyeOff size={16} color={toggleIconColor} /> : <Eye size={16} color={toggleIconColor} />}
          </Pressable>
        )}
      </View>
      {error && <Text className='text-sm text-destructive'>{error}</Text>}
    </View>
  )
})
