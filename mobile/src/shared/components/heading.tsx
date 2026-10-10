import type { ReactNode } from 'react'
import { Text } from 'react-native'

type HeadingLevel = 2 | 3 | 4 | 5

interface HeadingProps {
  level: HeadingLevel
  children: ReactNode
  className?: string
}

// Заголовки — те же размеры, что у Heading сайта на телефоне.
const LEVEL_CLASSES: Record<HeadingLevel, string> = {
  2: 'text-xl leading-tight font-bold tracking-tight text-gray-900',
  3: 'text-xl leading-tight font-bold text-gray-800',
  4: 'text-base leading-tight font-bold text-gray-900',
  // Подзаголовок раздела настроек («Пароль», «Тема оформления»).
  5: 'text-base leading-tight font-medium text-gray-900'
}

export function Heading({ level, children, className = '' }: HeadingProps) {
  return (
    <Text accessibilityRole='header' className={`${LEVEL_CLASSES[level]} ${className}`}>
      {children}
    </Text>
  )
}
