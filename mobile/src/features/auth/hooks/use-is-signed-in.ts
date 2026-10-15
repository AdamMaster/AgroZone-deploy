import { useAuthStore } from '../store/auth-store'

// Вошёл ли пользователь. true только после того, как приложение прочитало
// ключ из хранилища и он есть: пока статус «restoring», это false.
export function useIsSignedIn() {
  return useAuthStore(state => state.status === 'signedIn')
}
