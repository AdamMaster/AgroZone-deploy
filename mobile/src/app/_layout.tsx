import { Stack, ThemeProvider, useRouter } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

import { AppProviders } from '@/providers/app-providers'
import { useNavigationTheme } from '@/providers/use-navigation-theme'

import { useAuthStore } from '@/features/auth/store/auth-store'
import { SupportRealtime } from '@/features/support/components/support-realtime'
import { themeHydrated } from '@/features/theme/store/theme-store'

import '@/global.css'

// Сплэш держим, пока не прочитаны ключ сессии из защищённого хранилища и
// выбранная тема: иначе приложение на долю секунды показало бы гостевой
// интерфейс уже вошедшему пользователю или мелькнуло бы не той темой.
void SplashScreen.preventAutoHideAsync()

function RootNavigator() {
  const router = useRouter()
  const status = useAuthStore(state => state.status)
  const restore = useAuthStore(state => state.restore)
  const redirectAfterSignIn = useAuthStore(state => state.redirectAfterSignIn)
  const setRedirectAfterSignIn = useAuthStore(state => state.setRedirectAfterSignIn)
  const isSignedIn = status === 'signedIn'

  useEffect(() => {
    void Promise.all([restore(), themeHydrated]).finally(() => SplashScreen.hideAsync())
  }, [restore])

  // Гость нажал вкладку, требующую входа, вошёл — открываем эту вкладку
  // (returnTo окна входа на сайте).
  useEffect(() => {
    if (!isSignedIn || !redirectAfterSignIn) return

    setRedirectAfterSignIn(null)
    router.navigate(redirectAfterSignIn)
  }, [isSignedIn, redirectAfterSignIn, setRedirectAfterSignIn, router])

  if (status === 'restoring') return null

  // Stack.Protected: экраны входа доступны только гостю, настройки аккаунта
  // (пароль, почта, телефон, удаление) — только вошедшему. Когда статус меняется (вошёл, вышел, сессия истекла),
  // роутер сам убирает недоступные экраны.
  return (
    <>
      {isSignedIn && <SupportRealtime />}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name='(tabs)' />
        <Stack.Screen name='categories' options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name='oauth' options={{ animation: 'none' }} />

        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name='login' options={{ headerShown: true, title: 'Вход', presentation: 'modal' }} />
          <Stack.Screen name='register' options={{ headerShown: true, title: 'Регистрация', presentation: 'modal' }} />
        </Stack.Protected>

        <Stack.Protected guard={isSignedIn}>
          <Stack.Screen name='change-password' options={{ headerShown: true, presentation: 'modal' }} />
          <Stack.Screen name='change-email' options={{ headerShown: true, presentation: 'modal' }} />
          <Stack.Screen
            name='change-phone'
            options={{ headerShown: true, title: 'Изменить номер', presentation: 'modal' }}
          />
          <Stack.Screen
            name='delete-account'
            options={{ headerShown: true, title: 'Удаление аккаунта', presentation: 'modal' }}
          />
        </Stack.Protected>
      </Stack>
    </>
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
