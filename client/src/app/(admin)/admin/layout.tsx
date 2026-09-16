import { AdminNav } from '@/components/features/admin/components'

export default function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className='bg-neutral-900'>
      <div className='grid min-h-screen grid-cols-[280px_1fr] gap-6'>
        <div className='bg-neutral-800/30 pt-6'>
          <AdminNav />
        </div>
        <div className='relative w-full'>{children}</div>
      </div>
    </div>
  )
}
