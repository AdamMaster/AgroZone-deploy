import { ElementType, ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface HeadingProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6
  children: ReactNode
  className?: string
  // Позволяет визуально стилизовать текст под заголовок нужного уровня, но
  // отрендерить другим тегом — нужно, когда один и тот же заголовок должен
  // появляться в разметке дважды под разные брейкпоинты (см. AdDetail): на
  // странице объявления должен быть ровно один <h1>, а не два одинаковых по
  // смыслу тега, один из которых просто скрыт через CSS (это видно поисковым
  // роботам и парсерам разметки, даже если для глаза и скринридера на
  // экране всегда виден только один — display:none исключает и то, и то).
  as?: ElementType
}

export const Heading = ({ level = 1, children, className, as }: HeadingProps) => {
  const Tag: ElementType = as ?? `h${level}`

  const variants = {
    1: 'md:text-3xl sm:text-2xl text-xl font-bold tracking-tight text-gray-900 leading-tight',
    2: 'sm:text-2xl text-xl font-bold tracking-tight text-gray-900 leading-tight',
    3: 'text-xl font-bold text-gray-800 leading-tight',
    4: 'font-bold text-gray-900 leading-tight sm:text-lg text-base',
    5: 'text-base font-medium leading-tight',
    6: 'text-sm font-medium leading-tight'
  }

  return <Tag className={cn(variants[level], className)}>{children}</Tag>
}
