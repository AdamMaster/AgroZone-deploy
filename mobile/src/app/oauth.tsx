import { useRouter } from 'expo-router'
import { useEffect } from 'react'

// Адрес возврата после входа через Яндекс (agrozone://oauth). Сам вход
// завершает useYandexSignIn, получив этот адрес от системного окна входа.
// На Android система дополнительно открывает приложение по этой ссылке, и
// роутер приводит сюда — экран сразу уходит назад, чтобы пользователь не
// увидел «страница не найдена».
export default function OAuthReturnScreen() {
  const router = useRouter()

  useEffect(() => {
    if (router.canGoBack()) {
      router.back()
    } else {
      router.replace('/')
    }
  }, [router])

  return null
}
