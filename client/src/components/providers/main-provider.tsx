'use client'

import { ThemeProvider } from 'next-themes'
import { type PropsWithChildren } from 'react'

import { TooltipProvider } from '../ui'
import { TanstackQueryProvider } from './tanstack-query-provider'
import { ToastProvider } from './toast-provider'

export function MainProvider({ children }: PropsWithChildren<unknown>) {
  return (
    <ThemeProvider attribute='class' defaultTheme='light' enableSystem>
      <TanstackQueryProvider>
        <TooltipProvider>
          <ToastProvider />
          {children}
        </TooltipProvider>
      </TanstackQueryProvider>
    </ThemeProvider>
  )
}
