import { MetadataRoute } from 'next'

import { LEGAL_DETAILS } from '@/components/features/legal/legal-details'

// ВАЖНО: полноценных квадратных PNG-иконок (192×192, 512×512, плюс
// maskable-вариант с полями под безопасную зону Android) в проекте пока
// нет вообще — ни в /public, ни где-либо ещё; на них же ссылаются и
// пропущенные `favicon.ico`/`apple-touch-icon.png` в app/layout.tsx (это
// отдельный, более старый пробел, не заведённый этим файлом). Единственный
// доступный актив — широкий горизонтальный логотип-вордмарк
// (public/images/logo.svg, ~495×100), сжимать который в квадрат само по
// себе даст плохую иконку (текст обрежется/сплющится). Ниже он подключён
// как SVG — современные Chrome/Edge такое отрисовывают, но для нормальной
// иконки на домашнем экране Android/iOS нужны настоящие PNG, сделанные из
// квадратного варианта бренд-знака. Это осознанно не сделано за
// пользователя — иконка приложения такая же часть бренда, как сам логотип,
// решение по ней должен принять владелец, не аудит и не автоматика.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${LEGAL_DETAILS.siteName} — агропромышленная торговая площадка`,
    short_name: LEGAL_DETAILS.siteName,
    description: 'Всё для агробизнеса: продукция, сырьё, техника и оборудование оптом',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#40a500',
    lang: 'ru',
    icons: [
      {
        src: '/images/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      }
    ]
  }
}
