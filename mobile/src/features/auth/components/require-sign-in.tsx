import { Redirect } from 'expo-router'
import type { PropsWithChildren } from 'react'

import { useAuthStore } from '../store/auth-store'

// Вкладки только для вошедших (Избранное, Объявления, Сообщения, Профиль).
// Гость попадает сюда только если вышел, находясь на вкладке (или сессия
// истекла), — тогда возвращаем на главную, как сайт после выхода.
export function RequireSignIn({ children }: PropsWithChildren) {
  const isSignedIn = useAuthStore(state => state.status === 'signedIn')

  if (!isSignedIn) return <Redirect href='/' />

  return children
}
