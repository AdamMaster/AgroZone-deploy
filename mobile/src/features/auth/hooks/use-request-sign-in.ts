import { type Href, useRouter } from 'expo-router'
import { useCallback } from 'react'

import { useAuthStore } from '../store/auth-store'

// Открыть вход. returnTo — куда попасть после входа (как одноимённый
// параметр окна входа на сайте); без него пользователь остаётся там, где
// был. Значение записывается каждый раз, чтобы цель от прошлого,
// брошенного входа не сработала при следующем.
export function useRequestSignIn() {
  const router = useRouter()
  const setRedirectAfterSignIn = useAuthStore(state => state.setRedirectAfterSignIn)

  return useCallback(
    (returnTo: Href | null = null) => {
      setRedirectAfterSignIn(returnTo)
      router.push('/login')
    },
    [router, setRedirectAfterSignIn]
  )
}
