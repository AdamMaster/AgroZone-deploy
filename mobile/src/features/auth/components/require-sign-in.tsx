import { Redirect } from 'expo-router'
import type { PropsWithChildren } from 'react'

import { useIsSignedIn } from '../hooks/use-is-signed-in'

// Вкладки только для вошедших (Избранное, Объявления, Сообщения, Профиль).
// Гость попадает сюда только если вышел, находясь на вкладке (или сессия
// истекла), — тогда возвращаем на главную, как сайт после выхода.
export function RequireSignIn({ children }: PropsWithChildren) {
  const isSignedIn = useIsSignedIn()

  if (!isSignedIn) return <Redirect href='/' />

  return children
}
