import { QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Toaster } from 'sonner-native'

import { queryClient } from '@/lib/query/query-client'
import { useReactQueryNativeManagers } from '@/lib/query/use-react-query-native-managers'

export function AppProviders({ children }: PropsWithChildren) {
  useReactQueryNativeManagers()

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        {/* Всплывающие уведомления — как тосты sonner на сайте. */}
        <Toaster position='top-center' theme='system' richColors />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
