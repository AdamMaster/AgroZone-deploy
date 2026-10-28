import { SellerReportDetail } from '@/components/features/admin/components'

interface AdminSellerReportPageProps {
  params: Promise<{ sellerId: string }>
}

export default async function AdminSellerReportPage({ params }: AdminSellerReportPageProps) {
  const { sellerId } = await params

  return <SellerReportDetail sellerId={sellerId} />
}
