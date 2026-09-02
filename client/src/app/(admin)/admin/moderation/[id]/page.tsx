import { AdModerationDetail } from '@/components/features/admin/components'

interface AdModerationPageProps {
  params: Promise<{ id: string }>
}

export default async function AdModerationPage({ params }: AdModerationPageProps) {
  const { id } = await params

  return <AdModerationDetail id={id} />
}
