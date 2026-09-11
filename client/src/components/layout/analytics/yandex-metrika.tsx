'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { trackPageview } from '@/shared/utils'

const METRIKA_COUNTER_ID = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID

// Яндекс.Метрика с Вебвизором и целями (F15 в ROADMAP.md) — раньше
// счётчиков не было в коде вообще, без них нельзя было проверить эффект
// остальных пунктов ROADMAP (SEO-правки, конверсия и т.д.).
//
// Идентификатор счётчика — NEXT_PUBLIC_YANDEX_METRIKA_ID, задаётся в
// build-time (см. client/Dockerfile, docker-compose.prod.yml и DEPLOY.md
// п.3.1) — та же схема, что и у остальных NEXT_PUBLIC_-ключей (2GIS,
// DaData, капча). Сам счётчик заводится вручную в панели
// metrika.yandex.ru на домен agro-zone.ru — залогиниться в чужой аккаунт
// Яндекса я не могу (см. правила, тот же случай, что и с
// Яндекс.Вебмастером в S2). Пока переменная не задана — компонент не
// рендерит вообще ничего, ошибок сборки нет.
//
// mc.yandex.ru уже разрешён в CSP (nginx/conf.d/app.conf — script-src,
// connect-src, img-src).
export const YandexMetrika = () => {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (!METRIKA_COUNTER_ID) return

    // Первый pageview уже посчитан init-скриптом ниже — здесь считаем
    // только переходы МЕЖДУ страницами. У Next.js App Router это
    // SPA-навигация без перезагрузки документа, поэтому без ручного hit()
    // на каждый переход Метрика видела бы ровно один просмотр за весь
    // визит, сколько бы страниц пользователь ни открыл.
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const query = searchParams.toString()
    trackPageview(pathname + (query ? `?${query}` : ''))
  }, [pathname, searchParams])

  if (!METRIKA_COUNTER_ID) return null

  return (
    <>
      <Script id='yandex-metrika' strategy='afterInteractive'>
        {`
          (function(m,e,t,r,i,k,a){
            m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
          })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

          ym(${Number(METRIKA_COUNTER_ID)}, "init", {
            webvisor: true,
            clickmap: true,
            trackLinks: true,
            accurateTrackBounce: true
          });
        `}
      </Script>
      <noscript>
        <div>
          {/* Пиксель для пользователей без JS — стандартный сниппет
          Метрики. next/image тут неприменим: он сам требует клиентский JS
          для оптимизации и в <noscript> никогда бы не сработал. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://mc.yandex.ru/watch/${METRIKA_COUNTER_ID}`}
            style={{ position: 'absolute', left: '-9999px' }}
            alt=''
          />
        </div>
      </noscript>
    </>
  )
}
