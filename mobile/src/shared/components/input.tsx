import { forwardRef, useState } from 'react'
import { TextInput, type TextInputProps } from 'react-native'

interface InputProps extends Omit<TextInputProps, 'style'> {
  // Растянуть на всю доступную ширину (два поля в ряд: «От» и «До»).
  isFluid?: boolean
}

// Поле ввода — как Input сайта: серое поле, в фокусе белеет и получает
// зелёную рамку.
export const Input = forwardRef<TextInput, InputProps>(function Input(
  { isFluid = false, onFocus, onBlur, multiline, ...props },
  ref
) {
  const [isFocused, setIsFocused] = useState(false)

  return (
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
      } ${isFluid ? 'min-w-0 flex-1' : ''}`}
      {...props}
    />
  )
})
