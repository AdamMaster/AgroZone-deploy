import { ArrowLeftIcon } from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'

import { NewPasswordForm } from '@/components/features'
import { Container } from '@/components/layout'
import { Button, Logo } from '@/components/ui'

// Страница открывается только по ссылке из письма (токен в query),
// SEO/статике тут делать нечего. useSearchParams() внутри формы (см.
// компонент ниже) ломает статический пререндер без Suspense — проще и
// надёжнее сразу force-dynamic, тот же приём, что и в
// app/(admin)/layout.tsx и app/(main)/ads/create/page.tsx.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Новый пароль'
}

export default function NewPasswordPage() {
  return (
    <div className='bg-gray-50'>
      <Container className='relative'>
        <Link href='/'>
          <Button
            size='sm'
            variant='link'
            className='hover:text-primary absolute top-4 left-5 gap-2 text-sm text-gray-900'
          >
            <ArrowLeftIcon className='size-4' />
            Вернуться на главную
          </Button>
        </Link>
        <div className='flex min-h-screen flex-col items-center justify-center gap-9'>
          <Logo className='w-60' />

          <NewPasswordForm />
        </div>
      </Container>
    </div>
  )
}
