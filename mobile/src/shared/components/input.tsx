import { type ReactNode, forwardRef, useState } from 'react'
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native'

import { useThemeColor } from '@/shared/hooks/use-theme-color'
import { Eye, EyeOff } from '@/shared/icons/lucide'

interface InputProps extends Omit<TextInputProps, 'style'> {
  // Растянуть на всю доступную ширину (два поля в ряд: «От» и «До»).
  isFluid?: boolean
  // Кнопка внутри поля справа (InputAction, глазик пароля). Текст поля под
  // неё не заходит.
  trailing?: ReactNode
}

// Поле ввода — как Input сайта: серое поле, в фокусе белеет и получает
// зелёную рамку.
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { isFluid = false, onFocus, onBlur, multiline, trailing, ...props },
  ref
) {
  const [isFocused, setIsFocused] = useState(false)
  const [trailingWidth, setTrailingWidth] = useState(0)

  const input = (
    <TextInput
      ref={ref}
      placeholderTextColorClassName='accent-gray-500'
      onFocus={event => {
        setIsFocused(true)
        onFocus?.(event)
      }}
      onBlur={event => {
        setIsFocused(false)
        onBlur?.(event)
      }}
      multiline={multiline}
      // Многострочное поле (комментарий) — как Textarea сайта: три строки,
      // текст сверху.
      textAlignVertical={multiline ? 'top' : undefined}
      className={`rounded-lg border px-4 text-base text-gray-950 ${multiline ? 'min-h-24 py-3' : 'h-11'} ${
        isFocused ? 'border-[#5da500] bg-white dark:bg-gray-50' : 'border-border bg-gray-50'
      } ${isFluid && !trailing ? 'min-w-0 flex-1' : ''}`}
      style={trailing ? { paddingRight: trailingWidth } : undefined}
      {...props}
    />
  )

  if (!trailing) return input

  return (
    <View className={`justify-center ${isFluid ? 'min-w-0 flex-1' : ''}`}>
      {input}
      <View
        onLayout={event => setTrailingWidth(event.nativeEvent.layout.width)}
        className='absolute top-0 right-0 bottom-0 flex-row items-stretch'
      >
        {trailing}
      </View>
    </View>
  )
})

interface InputActionProps {
  title: string
  onPress: () => void
  disabled?: boolean
}

// Текстовая кнопка внутри поля — как FieldButton сайта («Изменить» у
// почты, «Подтвердить» у ИНН).
export function InputAction({ title, onPress, disabled = false }: InputActionProps) {
  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className='justify-center px-4 active:opacity-60 disabled:opacity-50'
    >
      <Text className='text-sm text-gray-900'>{title}</Text>
    </Pressable>
  )
}

type PasswordInputProps = Omit<InputProps, 'trailing' | 'secureTextEntry'>

// Поле пароля: ввод скрыт, справа глазик — как PasswordToggle сайта.
export const PasswordInput = forwardRef<TextInput, PasswordInputProps>(function PasswordInput(props, ref) {
  const [isSecure, setIsSecure] = useState(true)
  const iconColor = useThemeColor('--color-gray-500')

  return (
    <Input
      ref={ref}
      autoCapitalize='none'
      autoCorrect={false}
      {...props}
      secureTextEntry={isSecure}
      trailing={
        <Pressable
          accessibilityRole='button'
          accessibilityLabel={isSecure ? 'Показать пароль' : 'Скрыть пароль'}
          onPress={() => setIsSecure(value => !value)}
          className='justify-center px-3.5'
        >
          {/* Пароль скрыт — перечёркнутый глаз, виден — открытый, как на сайте. */}
          {isSecure ? <EyeOff size={16} color={iconColor} /> : <Eye size={16} color={iconColor} />}
        </Pressable>
      }
    />
  )
})
