import { AdStats } from '@/components/features/ads/components/ad-stats'
import { Container } from '@/components/layout'

interface AdStatsPageProps {
  params: Promise<{ id: string }>
}

export default async function AdStatsPage({ params }: AdStatsPageProps) {
  const { id } = await params

  return (
    <div>
      <Container>
        <AdStats adId={id} />
      </Container>
    </div>
  )
}
