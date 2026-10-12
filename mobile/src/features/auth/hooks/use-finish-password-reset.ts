import { useRouter } from 'expo-router'
import { useCallback } from 'react'
import { toast } from 'sonner-native'

import { useAuthStore } from '../store/auth-store'

// Конец сброса пароля (по ссылке из письма или по звонку): уведомление, как
// на сайте, и переход. Гостя ведём на вход; вошедшему (ссылку открыл другой
// аккаунт на этом телефоне) окно входа недоступно — возвращаем на главную.
export function useFinishPasswordReset() {
  const router = useRouter()
  const isSignedIn = useAuthStore(state => state.status === 'signedIn')

  return useCallback(() => {
    toast.success('Пароль успешно изменен', { description: 'Теперь вы можете войти в свой аккаунт.' })
    router.replace(isSignedIn ? '/' : '/login')
  }, [isSignedIn, router])
}
