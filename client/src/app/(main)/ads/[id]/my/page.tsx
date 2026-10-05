import { Metadata } from 'next'

import { AdOwnerView } from '@/components/features/ads/components/ad-owner-view'
import { categoriesService } from '@/components/features/categories/services'
import { Container } from '@/components/layout'

interface AdOwnerPageProps {
  params: Promise<{ id: string }>
}

// Личная страница владельца — в поисковую выдачу ей делать нечего.
export const metadata: Metadata = {
  robots: { index: false, follow: false }
}

export default async function AdOwnerPage({ params }: AdOwnerPageProps) {
  const { id } = await params

  const categories = await categoriesService.findAll().catch(() => [])

  return (
    <div>
      <Container>
        <AdOwnerView id={id} categories={categories} />
      </Container>
    </div>
  )
}
