import { DarkTheme, DefaultTheme, type Theme } from 'expo-router'
import { useMemo } from 'react'
import { useCSSVariable, useUniwind } from 'uniwind'

const THEME_VARIABLES = [
  '--color-primary',
  '--color-background',
  '--color-card',
  '--color-foreground',
  '--color-border',
  '--color-destructive'
]

// Нативная навигация (шапки экранов, фон между переходами) красится не
// классами, а объектом темы React Navigation. Берём цвета из тех же
// CSS-переменных global.css, что и весь остальной интерфейс, — единый
// источник правды, тема переключается вместе с системной.
export function useNavigationTheme(): Theme {
  const { theme } = useUniwind()
  const [primary, background, card, text, border, notification] = useCSSVariable(THEME_VARIABLES)

  return useMemo(() => {
    const base = theme === 'dark' ? DarkTheme : DefaultTheme

    return {
      ...base,
      colors: {
        primary: String(primary ?? base.colors.primary),
        background: String(background ?? base.colors.background),
        card: String(card ?? base.colors.card),
        text: String(text ?? base.colors.text),
        border: String(border ?? base.colors.border),
        notification: String(notification ?? base.colors.notification)
      }
    }
  }, [theme, primary, background, card, text, border, notification])
}
