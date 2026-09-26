import { MetadataRoute } from 'next'

import { LEGAL_DETAILS } from '@/components/features/legal/legal-details'

// Квадратный бренд-знак (AZ-монограмма, public/images/icon-192.png /
// icon-512.png) появился позже широкого горизонтального вордмарка
// (logo.svg, ~495×100, используется в шапке/подвале сайта) — вордмарк для
// иконки не годился (текст обрезался бы/сплющился при сжатии в квадрат),
// а из монограммы уже сделаны настоящие PNG нужных размеров. Тем же
// исходником закрыты и favicon.ico/apple-touch-icon.png в app/layout.tsx
// (раньше эти пути указывали на несуществующие файлы — 404,
// см. GSC "Не найдено (404)").
//
// purpose: 'any' — у монограммы уже есть свои поля вокруг знака (не
// вплотную к краям), но не настолько щедрые, чтобы гарантированно
// пройти maskable-safe-zone Android (контент должен помещаться в круг
// ~80% от размера) — доклеивать отдельный maskable-вариант с ещё большими
// полями смысла нет, пока не появится жалоба на обрезку иконки на
// конкретных Android-лаунчерах.
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
        src: '/images/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/images/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      }
    ]
  }
}
