import { Suspense } from 'react'

import { AdCreate } from '@/components/features/ads/components'
import { categoriesService } from '@/components/features/categories/services'
import { Container } from '@/components/layout'

// Страница только для авторизованных пользователей, данные всегда живые
// (категории, черновик) — статический пререндер тут не даёт пользы, а
// Suspense вокруг AdCreate (см. ниже) всё равно не спасает от той же
// ошибки "useSearchParams() should be wrapped in a suspense boundary" —
// она вылезает раньше, при попытке Next.js статически отрендерить сам
// сегмент. force-dynamic снимает это требование целиком (см. тот же приём
// в app/(admin)/layout.tsx).
export const dynamic = 'force-dynamic'

export default async function AdCreatePage() {
  const categories = await categoriesService.findAll()

  return (
    <Container className='pt-0 sm:pt-10'>
      <Suspense fallback={null}>
        <AdCreate categories={categories} />
      </Suspense>
    </Container>
  )
}
