import type { Href } from 'expo-router'
import { create } from 'zustand'

import { setSessionRejectedHandler } from '@/lib/api/api-client'
import { sessionTokenStorage } from '@/lib/auth/session-token-storage'
import { queryClient } from '@/lib/query/query-client'

import { authApi } from '../api/auth.api'
import type { AuthSession } from '../types/auth.types'

// restoring — приложение только запустилось и ещё читает ключ из
// защищённого хранилища (в это время виден сплэш, см. app/_layout.tsx).
export type AuthStatus = 'restoring' | 'signedIn' | 'signedOut'

export const profileQueryKey = ['profile'] as const

// Объявления зависят от того, кто вошёл (например, отметка «в избранном»).
const ADS_QUERY_KEY = ['ads'] as const

interface AuthState {
  status: AuthStatus
  // Куда вернуть пользователя после входа — как returnTo у окна входа на
  // сайте: гость нажал «Избранное», вошёл и попал в «Избранное», а не на
  // главную. Обрабатывает корневой навигатор (app/_layout.tsx).
  redirectAfterSignIn: Href | null
  setRedirectAfterSignIn: (href: Href | null) => void
  restore: () => Promise<void>
  signIn: (session: AuthSession) => Promise<void>
  signOut: () => Promise<void>
  clearLocalSession: () => Promise<void>
}

// При смене пользователя (вход, выход) его данные нельзя показывать из
// кэша: профиль удаляем, объявления перезапрашиваем. Перезапрос не
// ждём — вход и выход не должны зависеть от скорости загрузки ленты.
function resetUserDependentQueries() {
  queryClient.removeQueries({ queryKey: profileQueryKey })
  void queryClient.invalidateQueries({ queryKey: ADS_QUERY_KEY })
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  status: 'restoring',
  redirectAfterSignIn: null,

  setRedirectAfterSignIn(href) {
    set({ redirectAfterSignIn: href })
  },

  // Ключ есть — считаем пользователя вошедшим сразу, не дожидаясь сервера:
  // приложение открывается мгновенно и без интернета. Если сессия на
  // сервере уже закончилась, первый же запрос профиля получит 401, и
  // clearLocalSession переведёт приложение в «не вошёл».
  //
  // Если защищённое хранилище недоступно (редкий сбой системы), не зависаем
  // на сплэше, а открываем приложение как для гостя.
  async restore() {
    try {
      const token = await sessionTokenStorage.load()
      set({ status: token ? 'signedIn' : 'signedOut' })
    } catch {
      set({ status: 'signedOut' })
    }
  },

  async signIn({ sessionToken, user }) {
    // Без ключа сессия есть только на сервере, а приложение её не увидит —
    // так бывает, если сервер ещё не обновлён до версии с входом из
    // приложения. Говорим об этом прямо, а не делаем вид, что вход удался.
    if (!sessionToken) {
      throw new Error('Сервер не выдал ключ сессии. Попробуйте позже или обновите приложение.')
    }

    await sessionTokenStorage.save(sessionToken)
    resetUserDependentQueries()
    queryClient.setQueryData(profileQueryKey, user)
    set({ status: 'signedIn' })
  },

  // Выход: сначала гасим сессию на сервере, затем локально. Если сервер
  // недоступен, локально всё равно выходим — пользователь нажал «Выйти» и
  // должен выйти; серверная сессия тогда просто истечёт по сроку.
  async signOut() {
    try {
      await authApi.logout()
    } catch {
      // см. комментарий выше — локальный выход важнее
    }

    await get().clearLocalSession()
  },

  async clearLocalSession() {
    await sessionTokenStorage.clear()
    set({ status: 'signedOut', redirectAfterSignIn: null })
    resetUserDependentQueries()
  }
}))

// Сервер ответил 401 на запрос с ключом — сессия закончилась (истекла,
// завершена с другого устройства, аккаунт удалён).
setSessionRejectedHandler(() => {
  void useAuthStore.getState().clearLocalSession()
})
