import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, type PressableProps, Text, View } from 'react-native'

type ButtonVariant = 'primary' | 'outline' | 'destructive'

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string
  variant?: ButtonVariant
  // Идёт запрос: показываем крутилку и не даём нажать повторно.
  isLoading?: boolean
  // Значок слева от текста (например, логотип Яндекса).
  icon?: ReactNode
}

const VARIANT_CLASSES: Record<ButtonVariant, { container: string; text: string; spinner: string }> = {
  primary: { container: 'bg-primary', text: 'text-white', spinner: 'accent-white' },
  outline: { container: 'border border-border bg-card', text: 'text-foreground', spinner: 'accent-foreground' },
  destructive: { container: 'bg-destructive', text: 'text-white', spinner: 'accent-white' }
}

// Основная кнопка приложения. Высота 48 — минимальная зона нажатия,
// рекомендованная для пальца на iOS и Android.
export function Button({ title, variant = 'primary', isLoading = false, icon, disabled, ...props }: ButtonProps) {
  const classes = VARIANT_CLASSES[variant]
  const isDisabled = disabled || isLoading

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      disabled={isDisabled}
      className={`h-12 flex-row items-center justify-center gap-2 rounded-xl px-6 active:opacity-80 disabled:opacity-50 ${classes.container}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator colorClassName={classes.spinner} />
      ) : (
        <>
          {icon && <View>{icon}</View>}
          <Text className={`text-base font-semibold ${classes.text}`}>{title}</Text>
        </>
      )}
    </Pressable>
  )
}
