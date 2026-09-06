import { Suspense } from 'react'

import { HomeAdsFeed } from '@/components/features/home/components'
import { Container, JsonLd, WelcomeBanner } from '@/components/layout'
import { Heading } from '@/components/ui'

import { buildOrganizationJsonLd, buildWebSiteJsonLd } from '@/shared/utils/json-ld'

export default async function Home() {
  return (
    <div className='pt-0 sm:pt-4'>
      {/* Organization + WebSite (с SearchAction для строки поиска в выдаче
      Google) — только на главной, как и просил аудит (S5 в ROADMAP.md):
      это сведения о сайте в целом, а не о конкретной странице,
      дублировать их на каждой странице незачем и не рекомендуется самим
      Google. */}
      <JsonLd data={[buildOrganizationJsonLd(), buildWebSiteJsonLd()]} />
      <Container>
        {/* До этой задачи (S4 в ROADMAP.md) на главной вообще не было
        собственного <h1> — единственным заголовком, оказывавшимся в
        разметке раньше остальных, был sr-only <h2> диалога выбора региона
        (см. исправление в components/ui/command.tsx выше по этой же
        задаче). WelcomeBanner для роли H1 не годится — баннер закрывается
        и пропадает насовсем (localStorage), а H1 должен быть на странице
        всегда.
        По просьбе пользователя H1 скрыт визуально через sr-only (виден
        только скринридерам и поисковым роботам, дизайн главной не
        меняется) — это стандартный, легитимный приём (тот же класс уже
        используется в проекте, например у DialogTitle в command.tsx), а
        не "чёрная" техника обмана поисковика: текст точно описывает
        содержимое страницы. Нюанс, о котором пользователь предупреждён:
        видимый пользователю H1 обычно даёт чуть больше веса в
        ранжировании, чем скрытый — Google явно разрешает sr-only-текст
        для доступности, но не гарантирует ему тот же вес, что у видимого
        контента. */}
        <Heading level={1} className='sr-only'>
          Объявления на агропромышленной площадке AgroZone
        </Heading>
        <WelcomeBanner />
        <Suspense fallback={null}>
          <HomeAdsFeed />
        </Suspense>
      </Container>
    </div>
  )
}
