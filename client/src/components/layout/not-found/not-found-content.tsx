import Link from 'next/link'

import { Button, Heading } from '@/components/ui'

// Общий контент 404 — используется и в app/(main)/not-found.tsx (сработает
// на notFound() из маршрутов внутри (main), например ads/[id] или
// несуществующей категории каталога — Next сам оборачивает его в
// (main)/layout.tsx), и в корневом app/not-found.tsx (единственный
// вариант, который Next покажет на URL, вообще не совпавший ни с одним
// маршрутом, — для него шапка/футер оборачиваются вручную, см. комментарий
// там). Вынесено в отдельный компонент, чтобы не дублировать разметку.
export function NotFoundContent() {
  return (
    <div className='flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center'>
      <Heading level={1}>404</Heading>
      <p className='text-muted-foreground'>Такой страницы не существует или она была удалена.</p>
      <Button variant='secondary'>
        <Link href='/'>На главную</Link>
      </Button>
    </div>
  )
}
