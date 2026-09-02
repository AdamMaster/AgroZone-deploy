import { PromoteAd } from '@/components/features/ads/components/promote-ad'
import { Container } from '@/components/layout'

interface PromoteAdPageProps {
  params: Promise<{ id: string }>
}

export default async function PromoteAdPage({ params }: PromoteAdPageProps) {
  const { id } = await params

  return (
    <div className='py-10'>
      <Container>
        <PromoteAd id={id} />
      </Container>
    </div>
  )
}
