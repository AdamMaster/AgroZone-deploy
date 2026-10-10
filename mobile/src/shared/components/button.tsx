import type { ReactNode } from 'react'
import { ActivityIndicator, Pressable, type PressableProps, Text, View } from 'react-native'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive'

interface ButtonProps extends Omit<PressableProps, 'children' | 'style'> {
  title: string
  variant?: ButtonVariant
  // Идёт запрос: показываем крутилку и не даём нажать повторно.
  isLoading?: boolean
  // Значок слева от текста (например, логотип Яндекса).
  icon?: ReactNode
  // sm — второстепенное действие внутри формы, как кнопка размера default
  // сайта: ниже и мельче шрифт.
  size?: 'default' | 'sm'
}

const SIZE_CLASSES = {
  default: { container: 'h-12 rounded-xl px-6', text: 'text-base font-semibold' },
  sm: { container: 'h-10 rounded-lg px-4', text: 'text-sm font-medium' }
} as const

const VARIANT_CLASSES: Record<ButtonVariant, { container: string; text: string; spinner: string }> = {
  primary: { container: 'bg-primary', text: 'text-white', spinner: 'accent-white' },
  // Тёмно-синяя — как variant='secondary' сайта («Показать» в фильтре).
  secondary: { container: 'bg-secondary', text: 'text-white', spinner: 'accent-white' },
  outline: { container: 'border border-border bg-card', text: 'text-foreground', spinner: 'accent-foreground' },
  destructive: { container: 'bg-destructive', text: 'text-white', spinner: 'accent-white' }
}

// Основная кнопка приложения. Высота 48 — удобная зона нажатия для пальца
// на iOS и Android.
export function Button({
  title,
  variant = 'primary',
  size = 'default',
  isLoading = false,
  icon,
  disabled,
  ...props
}: ButtonProps) {
  const classes = VARIANT_CLASSES[variant]
  const sizeClasses = SIZE_CLASSES[size]
  const isDisabled = disabled || isLoading

  return (
    <Pressable
      accessibilityRole='button'
      accessibilityState={{ disabled: isDisabled, busy: isLoading }}
      disabled={isDisabled}
      className={`flex-row items-center justify-center gap-2 active:opacity-80 disabled:opacity-50 ${sizeClasses.container} ${classes.container}`}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator colorClassName={classes.spinner} />
      ) : (
        <>
          {icon && <View>{icon}</View>}
          <Text className={`${sizeClasses.text} ${classes.text}`} numberOfLines={1}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  )
}
