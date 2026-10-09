import { useMutation } from '@tanstack/react-query'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'

import { authApi } from '../api/auth.api'
import { createCodeChallenge, createCodeVerifier } from '../lib/pkce'
import { useAuthStore } from '../store/auth-store'

// Адрес, на который сервер вернёт пользователя после входа на Яндексе:
// agrozone://oauth в собранном приложении, exp://…/--/oauth в Expo Go.
// Экран-приёмник — app/oauth.tsx.
const OAUTH_RETURN_PATH = 'oauth'

// Вход через Яндекс ID:
//  1. сервер выдаёт ссылку на Яндекс, запомнив отпечаток нашего секрета;
//  2. Яндекс открывается в системном браузере (там пользователь обычно уже
//     вошёл в Яндекс и просто подтверждает вход);
//  3. сервер возвращает в приложение одноразовый код;
//  4. код + секрет меняем на сессию.
// null — пользователь закрыл окно входа сам, это не ошибка.
export function useYandexSignIn() {
  const signIn = useAuthStore(state => state.signIn)

  return useMutation({
    mutationFn: async () => {
      const redirectUri = Linking.createURL(OAUTH_RETURN_PATH)
      const codeVerifier = createCodeVerifier()
      const codeChallenge = await createCodeChallenge(codeVerifier)

      const { url } = await authApi.oauthConnect('yandex', { redirectUri, codeChallenge })
      const result = await WebBrowser.openAuthSessionAsync(url, redirectUri)

      if (result.type !== 'success') return null

      const { queryParams } = Linking.parse(result.url)
      const error = queryParams?.error
      const ticket = queryParams?.ticket

      if (typeof error === 'string' && error) throw new Error(error)
      if (typeof ticket !== 'string' || !ticket) {
        throw new Error('Яндекс не вернул подтверждение входа. Попробуйте ещё раз.')
      }

      const session = await authApi.oauthExchange({ ticket, codeVerifier })
      await signIn(session)

      return session
    }
  })
}
