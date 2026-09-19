'use client'

import dynamic from 'next/dynamic'

// SupportChatWidget тянет за собой socket.io-client и монтируется на
// КАЖДОЙ странице сайта (см. app/layout.tsx) — без этого его JS попадает в
// синхронный main/shared чанк, который парсится до первой отрисовки любой
// страницы. Сам layout.tsx — серверный компонент, а `ssr: false` у
// `next/dynamic` разрешён только внутри клиентских (иначе Next падает с
// "ssr: false is not allowed with next/dynamic in Server Components") —
// поэтому здесь отдельный маленький клиентский модуль-обёртка, а не
// dynamic() прямо в layout.tsx.
//
// Поведение виджета не меняется: он всё ещё монтируется сразу на каждой
// странице и сокет подключается сразу же (бейдж непрочитанного должен
// работать и при закрытой панели — см. комментарий в самом
// support-chat-widget.tsx). Меняется только то, что его код теперь лежит в
// отдельном асинхронном чанке, а не блокирует парсинг основного бандла.
export const SupportChatWidget = dynamic(() => import('./support-chat-widget').then(mod => mod.SupportChatWidget), {
  ssr: false
})
