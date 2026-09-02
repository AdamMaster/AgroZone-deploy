import { Heading } from '@/components/ui'

import { Container } from '../container'

interface StaticPagePlaceholderProps {
  title: string
  description: string
}

// Общий шаблон для страниц-заглушек в футере (Помощь, Безопасность, О
// компании, Пользовательское соглашение, Политика конфиденциальности).
// Пока страницы не наполнены реальным содержанием — используем один
// компонент вместо копирования разметки в каждый page.tsx.
export const StaticPagePlaceholder = ({ title, description }: StaticPagePlaceholderProps) => {
  return (
    <Container className='max-w-220 py-10'>
      <div className='mb-4 flex flex-wrap items-center gap-3'>
        <Heading level={1}>{title}</Heading>
        <span className='w-fit rounded-2xl bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500'>
          Страница дорабатывается
        </span>
      </div>
      <p className='max-w-160 text-gray-500'>{description}</p>
    </Container>
  )
}
