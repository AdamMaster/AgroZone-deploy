'use client'

import { ChevronLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { MouseEvent } from 'react'

import { cn } from '@/lib/utils'

import { ICategory } from '../types/categories.types'

interface CategoryItemProps {
  category: ICategory & {
    isParent?: boolean
    isSelected?: boolean
  }
  href: string
  className?: string
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void
  // Иконки категорий верхнего уровня (их всего 14, фиксированный список —
  // не бесконечная лента) грузились с дефолтным loading="lazy" и на проде
  // (в отличие от дева) реально НИКОГДА не догружались — пользователь
  // 08.09.2026 прислал скриншот с половиной пустых плашек. Подтверждено
  // руками: у живых <img> с loading="lazy" natural-размер так и остаётся
  // 0 сколько ни жди, а стоит выставить loading="eager" на том же элементе
  // — картинка тут же подгружается. Раз список короткий и конечный,
  // помечаем все иконки priority (не только первые N, как обычно советуют
  // для длинных лент) — см. проброс из CategoryGrid.
  priority?: boolean
}

export const CategoryItem = ({ category, href, className, onClick, priority }: CategoryItemProps) => {
  // Ключи — реальные slug'и категорий (после переименования на короткие
  // названия slug пересчитывается заново), значения — пути к уже
  // существующим файлам картинок, их переименовывать не понадобилось.
  const icons: Record<string, string> = {
    agrohimiya: '/images/categories/agrohimiya.png',
    'sh-zhivotnye-i-ptica': '/images/categories/selskohozyajstvennye-zhivotnye-ptica-i-akvakultura.png',
    'korma-i-komponenty': '/images/categories/korma-i-kormovye-komponenty.png',
    oborudovanie: '/images/categories/oborudovanie.png',
    'produkty-pererabotki': '/images/categories/produkty-pererabotki.png',
    'svezhaya-selhozprodukciya': '/images/categories/svezhaya-selhozprodukciya.png',
    agrokultury: '/images/categories/selhozprodukciya-i-rastitelnoe-syryo.jpg',
    'sh-tehnika': '/images/categories/sh-tehnika.png',
    'tara-i-upakovka': '/images/categories/tara-i-upakovka.png',
    veterinariya: '/images/categories/veterinariya.png',
    'polevye-kultury': '/images/categories/polevye-kultury.png',
    'zhivotnoe-syryo': '/images/categories/zhivotnoe-syryo.png',
    'posadochnyj-material': '/images/categories/posadochnyj-material.png',
    'zemli-i-obuekty-sh-nedvizhimosti': '/images/categories/zemli-i-obuekty-sh-nedvizhimosti.png',
    prochee: '/images/categories/prochee.png'
  }

  const isTopLevelCard = category.level === 0 && !category.isParent
  const icon = isTopLevelCard ? icons[category.slug] : undefined

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'relative flex min-h-[53px] max-w-[160px] gap-1 overflow-hidden rounded-lg bg-gray-100 text-[13px] leading-tight hover:bg-gray-200 md:max-w-[260px]',
        isTopLevelCard ? 'h-19 px-3.5 py-2.5 pr-8 md:h-25 md:max-w-75 md:pr-12' : 'px-4 py-2.5 md:max-w-75',
        category.isSelected && 'bg-gray-200 dark:bg-neutral-50 dark:text-neutral-900',
        category.isParent && 'bg-primary hover:bg-primary-foreground text-white',
        className
      )}
    >
      {icon && (
        <Image
          src={icon}
          alt={category.name}
          width={230}
          height={230}
          sizes='(min-width: 768px) 80px, 56px'
          priority={priority}
          className='absolute -right-2 bottom-0 z-1 h-12 w-14 object-contain object-bottom-right md:h-18 md:w-20'
        />
      )}
      <div className={cn('relative z-1 flex gap-1', !isTopLevelCard && 'items-center')}>
        {category.isParent && <ChevronLeft size={16} />}
        {category.name}
      </div>
    </Link>
  )
}
