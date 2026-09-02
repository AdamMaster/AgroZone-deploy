import { Suspense } from 'react'

import { HomeAdsFeed, HomeLocationPicker } from '@/components/features/home/components'
import { Container, WelcomeBanner } from '@/components/layout'

export default async function Home() {
  return (
    <div className='pt-0 sm:pt-4'>
      <Container>
        <WelcomeBanner />
        <Suspense fallback={null}>
          <HomeAdsFeed />
        </Suspense>
      </Container>
    </div>
  )
}
