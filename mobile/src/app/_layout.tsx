import { Stack, ThemeProvider, useRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

import { AppProviders } from '@/providers/app-providers'
import { useNavigationTheme } from '@/providers/use-navigation-theme'

import { useAuthStore } from '@/features/auth/store/auth-store'

import '@/global.css'

// Сплэш держим, пока не прочитан ключ сессии из защищённого хранилища:
// иначе приложение на долю секунды показало бы гостевой интерфейс уже
// вошедшему пользователю.
void SplashScreen.preventAutoHideAsync()

function RootNavigator() {
  const router = useRouter()
  const status = useAuthStore(state => state.status)
  const restore = useAuthStore(state => state.restore)
  const redirectAfterSignIn = useAuthStore(state => state.redirectAfterSignIn)
  const setRedirectAfterSignIn = useAuthStore(state => state.setRedirectAfterSignIn)
  const isSignedIn = status === 'signedIn'

  useEffect(() => {
    void restore().finally(() => SplashScreen.hideAsync())
  }, [restore])

  // Гость нажал вкладку, требующую входа, вошёл — открываем эту вкладку
  // (returnTo окна входа на сайте).
  useEffect(() => {
    if (!isSignedIn || !redirectAfterSignIn) return

    setRedirectAfterSignIn(null)
    router.navigate(redirectAfterSignIn)
  }, [isSignedIn, redirectAfterSignIn, setRedirectAfterSignIn, router])

  if (status === 'restoring') return null

  // Stack.Protected: экраны входа доступны только гостю, удаление аккаунта —
  // только вошедшему. Когда статус меняется (вошёл, вышел, сессия истекла),
  // роутер сам убирает недоступные экраны.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name='(tabs)' />
      <Stack.Screen name='categories' options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name='oauth' options={{ animation: 'none' }} />

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name='login' options={{ headerShown: true, title: 'Вход', presentation: 'modal' }} />
        <Stack.Screen name='register' options={{ headerShown: true, title: 'Регистрация', presentation: 'modal' }} />
      </Stack.Protected>

      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen
          name='delete-account'
          options={{ headerShown: true, title: 'Удаление аккаунта', presentation: 'modal' }}
        />
      </Stack.Protected>
    </Stack>
  )
}

export default function RootLayout() {
  const navigationTheme = useNavigationTheme()

  return (
    <AppProviders>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style='auto' />
        <RootNavigator />
      </ThemeProvider>
    </AppProviders>
  )
}
