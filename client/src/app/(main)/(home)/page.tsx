import { Suspense } from 'react'

import { HomeAdsFeed, HomeLocationPicker } from '@/components/features/home/components'
import { Container } from '@/components/layout'

export default async function Home() {
  return (
    <div className='pt-0 sm:pt-4'>
      <Container>
        {/* AdsClient (внутри HomeAdsFeed) вызывает useSearchParams() —
        без Suspense статический пререндер главной падает так же, как
        раньше падал /ads/create. Suspense вместо force-dynamic — чтобы
        не терять статику/SEO у самой важной страницы сайта целиком. */}
        <Suspense fallback={null}>
          <HomeAdsFeed />
        </Suspense>
      </Container>
    </div>
  )
}
