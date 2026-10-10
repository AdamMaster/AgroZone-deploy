import { useSegments } from 'expo-router'

// Вкладки со своим стеком (app/(tabs)/(home,favorites,my-ads,profile,messages)):
// объявление и переписка открываются внутри той вкладки, где пользователь
// сейчас, — нижняя панель и «Назад» ведут себя, как он ожидает.
export const TAB_STACKS = ['(home)', '(favorites)', '(my-ads)', '(profile)', '(messages)'] as const
export type TabStack = (typeof TAB_STACKS)[number]

export function useTabStack(): TabStack {
  const segments = useSegments() as readonly string[]

  return TAB_STACKS.find(item => segments.includes(item)) ?? '(home)'
}
