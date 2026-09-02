import { AdminNav } from '@/components/features/admin/components'
import { Container } from '@/components/layout'
import { Logo } from '@/components/ui'

export default function AdminLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className='bg-neutral-800'>
      <Container>
        <div className='grid min-h-screen grid-cols-[280px_1fr] gap-6'>
          <div className='bg-neutral-700/30'>
            <AdminNav />
          </div>
          <div className='relative w-full'>{children}</div>
        </div>
      </Container>
    </div>
  )
}
