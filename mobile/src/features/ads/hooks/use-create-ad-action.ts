import { useRouter } from 'expo-router'
import { useCallback } from 'react'

import { useIsSignedIn } from '@/features/auth/hooks/use-is-signed-in'
import { useRequestSignIn } from '@/features/auth/hooks/use-request-sign-in'

// «Разместить объявление» — общее для всех мест, где есть эта кнопка
// (баннер главной, «Мои объявления»). Гостя, как и на сайте, сначала
// просим войти — после входа он попадёт сразу в форму.
export function useCreateAdAction() {
  const router = useRouter()
  const requestSignIn = useRequestSignIn()
  const isSignedIn = useIsSignedIn()

  return useCallback(() => {
    if (!isSignedIn) {
      requestSignIn('/create-ad')
      return
    }

    router.push('/create-ad')
  }, [isSignedIn, requestSignIn, router])
}
