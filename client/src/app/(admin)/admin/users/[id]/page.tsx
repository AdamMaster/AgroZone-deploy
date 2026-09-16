import { UserAdminDetail } from '@/components/features/admin/components'

interface AdminUserDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function AdminUserDetailPage({ params }: AdminUserDetailPageProps) {
  const { id } = await params

  return <UserAdminDetail id={id} />
}
