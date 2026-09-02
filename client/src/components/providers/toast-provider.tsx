'use client'

import { Toaster } from '../ui'

export function ToastProvider() {
  return <Toaster position='top-center' duration={6000} />
}
