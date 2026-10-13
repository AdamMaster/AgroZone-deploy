'use client'

import dynamic from 'next/dynamic'

// Как support-chat-widget-lazy.tsx: сокет-клиент не должен попадать в
// синхронный бандл, а `ssr: false` в dynamic() разрешён только в клиентском
// модуле (layout.tsx — серверный).
export const ConversationsRealtime = dynamic(
  () => import('./conversations-realtime').then(mod => mod.ConversationsRealtime),
  { ssr: false }
)
