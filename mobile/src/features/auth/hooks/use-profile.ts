import { useQuery } from '@tanstack/react-query'

import { authApi } from '../api/auth.api'
import { profileQueryKey, useAuthStore } from '../store/auth-store'

// Профиль текущего пользователя. Запрашивается только когда пользователь
// вошёл; сразу после входа он уже лежит в кэше (signIn кладёт его туда из
// ответа сервера), так что лишнего запроса нет.
export function useProfile() {
  const isSignedIn = useAuthStore(state => state.status === 'signedIn')

  return useQuery({
    queryKey: profileQueryKey,
    queryFn: ({ signal }) => authApi.getProfile(signal),
    enabled: isSignedIn,
    staleTime: 5 * 60_000
  })
}
