import { AdminNav } from '@/components/features/admin/components'

export default function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className='bg-mist-900'>
      <div className='grid min-h-screen grid-cols-[280px_1fr]'>
        <div className='border-r border-mist-800 pt-6'>
          <AdminNav />
        </div>
        <div className='relative w-full bg-mist-800/30 px-6'>{children}</div>
      </div>
    </div>
  )
}
