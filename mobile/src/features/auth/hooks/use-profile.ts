import { useQuery } from '@tanstack/react-query'

import { authApi } from '../api/auth.api'
import { profileQueryKey } from '../store/auth-store'
import { useIsSignedIn } from './use-is-signed-in'

// Профиль текущего пользователя. Запрашивается только когда пользователь
// вошёл; сразу после входа он уже лежит в кэше (signIn кладёт его туда из
// ответа сервера), так что лишнего запроса нет.
export function useProfile() {
  const isSignedIn = useIsSignedIn()

  return useQuery({
    queryKey: profileQueryKey,
    queryFn: ({ signal }) => authApi.getProfile(signal),
    enabled: isSignedIn,
    staleTime: 5 * 60_000
  })
}
