import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import { cn } from '@/lib/utils'

// Универсальные хлебные крошки — принимают готовый массив пунктов, ничего
// сами не знают про источник данных. Раньше был жёстко завязан на
// useAdStore (стейт формы создания объявления), из-за чего его нельзя было
// переиспользовать там, где категория приходит не из стора (например, на
// публичной странице объявления).
//
// `href` у пункта опциональный: там, где кликать некуда или не нужно
// (например, в форме создания объявления — крошки там просто показывают
// текущий выбор, а не ведут по каталогу), можно передать пункты без href,
// и они отрендерятся обычным текстом.
export interface CategoryBreadcrumbItem {
  name: string
  href?: string
}

interface CategoryBreadcrumbsProps {
  items: CategoryBreadcrumbItem[]
  className?: string
  // На мобильном показывать только последний пункт (саму выбранную
  // категорию), без предков и без чеврона — полный путь на узком экране
  // переносится на несколько строк и выглядит громоздко (см. обсуждение с
  // пользователем — конкретно про CategoryCascader, где путь показывается
  // после выбора категории). По умолчанию выключено (false/undefined) —
  // остальные места использования (страница объявления, шаг 2 формы и т.д.)
  // как показывали полный путь всегда, так и показывают. Реализовано чисто
  // на CSS (hidden/md:flex у каждого промежуточного пункта), а не через JS
  // проверку ширины экрана — не нужно ни доп. состояние, ни ресайз-листенер.
  mobileCollapse?: boolean
}

export const CategoryBreadcrumbs = ({ items, className, mobileCollapse }: CategoryBreadcrumbsProps) => {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-y-1 pt-0 pb-5 text-sm text-gray-500 sm:pt-4 sm:pb-7', className)}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <div key={index} className={cn('items-center', mobileCollapse && !isLast ? 'hidden md:flex' : 'flex')}>
            {item.href ? (
              <Link href={item.href} className='hover:text-primary'>
                {item.name}
              </Link>
            ) : (
              <span>{item.name}</span>
            )}
            {!isLast && <ChevronRight size={14} className='mx-0.5 ml-1' />}
          </div>
        )
      })}
    </div>
  )
}
