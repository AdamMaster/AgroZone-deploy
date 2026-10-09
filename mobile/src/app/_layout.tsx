import { Stack, ThemeProvider } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'

import { AppProviders } from '@/providers/app-providers'
import { useNavigationTheme } from '@/providers/use-navigation-theme'

import { AccountHeaderButton } from '@/features/auth/components/account-header-button'
import { useAuthStore } from '@/features/auth/store/auth-store'

import '@/global.css'

// Сплэш держим, пока не прочитан ключ сессии из защищённого хранилища:
// иначе приложение на долю секунды показало бы «Войти» уже вошедшему
// пользователю.
void SplashScreen.preventAutoHideAsync()

function RootNavigator() {
  const status = useAuthStore(state => state.status)
  const restore = useAuthStore(state => state.restore)
  const isSignedIn = status === 'signedIn'

  useEffect(() => {
    void restore().finally(() => SplashScreen.hideAsync())
  }, [restore])

  if (status === 'restoring') return null

  // Stack.Protected: экраны входа доступны только гостю, профиль — только
  // вошедшему. Когда статус меняется (вошёл, вышел, сессия истекла), роутер
  // сам убирает недоступные экраны — отдельной навигации «после входа» не
  // нужно.
  return (
    <Stack>
      <Stack.Screen name='index' options={{ title: 'AgroZone', headerRight: () => <AccountHeaderButton /> }} />
      <Stack.Screen name='oauth' options={{ headerShown: false, animation: 'none' }} />

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name='login' options={{ title: 'Вход', presentation: 'modal' }} />
        <Stack.Screen name='register' options={{ title: 'Регистрация', presentation: 'modal' }} />
      </Stack.Protected>

      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name='profile' options={{ title: 'Профиль' }} />
        <Stack.Screen name='delete-account' options={{ title: 'Удаление аккаунта', presentation: 'modal' }} />
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
