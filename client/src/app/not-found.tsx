import Link from 'next/link'

import { Button, Heading } from '@/components/ui'

export default function NotFound() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center'>
      <Heading level={1}>404</Heading>
      <p className='text-muted-foreground mb-4'>Страница не найдена</p>
      <Button variant='secondary'>
        <Link href='/'>На главную</Link>
      </Button>
    </div>
  )
}
