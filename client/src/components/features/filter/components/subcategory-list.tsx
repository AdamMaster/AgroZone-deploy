'use client'

import { CommandItem } from 'cmdk'
import { useState } from 'react'

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList, Label } from '@/components/ui'

import { cn } from '@/lib/utils'

import { ICategory } from '../../categories/types'

interface SubcategoryListProps {
  categories: ICategory[]
  // Переход по выбранной категории — решает вызывающая сторона (filter.tsx,
  // через filters.selectCategory): в десктопном сайдбаре это обычная
  // навигация сразу же, в мобильном окне фильтра — только запоминание
  // выбора до нажатия "Показать" (см. useCatalogFilters).
  onSelect: (fullPath: string) => void
  label?: string
  placeholder?: string
}

// Список категорий — обычная навигация в одну из них (переход по ссылке),
// не мультивыбор. Через Command (тот же cmdk, что уже используется в
// CategoryCascader на форме подачи объявления), а не плоский список ссылок
// с "Показать ещё": у категорий сайта медианное число подкатегорий — 12, а
// у некоторых ("Фрукты, ягоды" и т.п.) — больше 50, так что список с
// разворачиванием превращался бы в стену ссылок в узком сайдбаре.
// Принимает уже готовый плоский список (children текущей категории, либо
// весь верхний уровень categories, когда категория ещё не выбрана — см.
// filter.tsx), сам компонент не знает, чей это список.
export const SubcategoryList = ({
  categories,
  onSelect,
  label = 'Категория',
  placeholder = 'Найти категорию'
}: SubcategoryListProps) => {
  const [open, setOpen] = useState(false)

  if (!categories.length) return null

  const handleSelect = (fullPath: string) => {
    setOpen(false)
    onSelect(fullPath)
  }

  return (
    <div className='flex flex-col gap-2'>
      <Label>{label}</Label>
      <Command className={cn('overflow-initial relative h-[46px] rounded-lg border', open ? 'focus-input' : 'border')}>
        <CommandInput
          className='h-full p-0 placeholder:text-gray-500'
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
        />
        {open && (
          <div className='absolute top-[calc(100%+10px)] left-0 z-10 w-full overflow-hidden rounded-lg border bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:bg-[#212121]'>
            <CommandList className='rounded-0 py-2'>
              <CommandEmpty>Категории не найдены.</CommandEmpty>
              <CommandGroup>
                {categories.map(child => (
                  <CommandItem
                    className='flex cursor-pointer gap-2 px-3.5 py-1.5 text-sm hover:bg-gray-50'
                    key={child.id}
                    value={child.name}
                    onSelect={() => handleSelect(child.fullPath)}
                  >
                    {child.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
        )}
      </Command>
    </div>
  )
}
