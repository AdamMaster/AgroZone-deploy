import { usePathname, useRouter } from 'expo-router'
import { useCallback } from 'react'

import { PROFILE_ROUTES, type ProfileRoute } from '../constants/profile-routes'

// Переход между разделами профиля внутри вкладки. «Личные данные» — первый
// экран стека вкладки: к нему возвращаемся, а не открываем второй такой же
// поверх. Уже открытый раздел повторно не открывается.
export function useOpenProfileSection() {
  const router = useRouter()
  const pathname = usePathname()

  return useCallback(
    (route: ProfileRoute) => {
      if (pathname === route) return

      if (route === PROFILE_ROUTES.general) {
        router.dismissTo(route)
      } else {
        router.push(route)
      }
    },
    [pathname, router]
  )
}
