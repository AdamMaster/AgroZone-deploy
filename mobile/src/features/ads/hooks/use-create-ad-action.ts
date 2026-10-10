import { useCallback } from 'react'
import { toast } from 'sonner-native'

import { useRequestSignIn } from '@/features/auth/hooks/use-request-sign-in'
import { useAuthStore } from '@/features/auth/store/auth-store'

// «Разместить объявление» — общее для всех мест, где есть эта кнопка
// (баннер главной, «Мои объявления»). Гостя, как и на сайте, сначала
// просим войти. Подача объявления в приложении — отдельный этап; до него
// честно говорим об этом.
export function useCreateAdAction() {
  const requestSignIn = useRequestSignIn()
  const isSignedIn = useAuthStore(state => state.status === 'signedIn')

  return useCallback(() => {
    if (!isSignedIn) {
      requestSignIn()
      return
    }

    toast.info('Подача объявления появится в следующем обновлении приложения')
  }, [isSignedIn, requestSignIn])
}
