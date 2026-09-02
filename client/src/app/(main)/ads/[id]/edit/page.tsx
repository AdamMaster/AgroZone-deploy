import { AdEdit } from '@/components/features/ads/components/ad-edit'
import { categoriesService } from '@/components/features/categories/services'
import { Container } from '@/components/layout'

interface AdEditPageProps {
  params: Promise<{ id: string }>
}

export default async function AdEditPage({ params }: AdEditPageProps) {
  const { id } = await params

  const categories = await categoriesService.findAll()

  return (
    <div className='sm:pt-10'>
      <Container>
        <AdEdit id={id} categories={categories} />
      </Container>
    </div>
  )
}
