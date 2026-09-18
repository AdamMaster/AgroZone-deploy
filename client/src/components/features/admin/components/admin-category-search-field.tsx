'use client'

import { CommandItem } from 'cmdk'
import { ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

import { useCategorySearchSuggest } from '@/components/features/categories/hooks/use-category-search-suggest'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandList, Loading } from '@/components/ui'

import { findCategoryById, flattenCategories, getPathToCategory } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { CategoryBreadcrumbs } from '../../ads/components/category-breadcrumbs'
import { useCategoryFeaturesLoader } from '../../ads/hooks/use-category-features-loader'
import { ICategory, ICategoryFeature } from '../../ads/types/ad.types'

interface AdminCategorySearchFieldProps {
  categories: ICategory[]
  // ID ТЕКУЩЕЙ выбранной категории — controlled-снаружи (см.
  // SetAdCategoryDialog), не собственный стейт компонента: родитель уже
  // держит его в своём стейте, чтобы использовать при сохранении.
  categoryId: string
  onSelect: (categoryId: string, features: ICategoryFeature[], priceUnits: string[]) => void
  className?: string
}

// Поиск и выбор категории для админских действий над чужим объявлением
// (см. SetAdCategoryDialog) — сознательно ОТДЕЛЬНЫЙ от CategoryCascader
// компонент, а не его "compact"-режим через проп-флаг. CategoryCascader —
// полноценный браузер дерева категорий (поиск + 3-колоночная сетка) под
// форму подачи объявления продавцом на всю ширину страницы; пытались
// научить его же самого условно прятать сетку под узкую модалку админки
// (см. историю правок этого файла и category-cascader.tsx) — получившийся
// компонент с двумя пересекающимися флагами (isMobile/isCompact) и мёртвым
// стейтом 3-колоночной сетки в компактном режиме стал трудно читать,
// решили не тащить это дальше.
//
// Здесь — только поиск по плоскому списку ЛИСТОВЫХ категорий: админ обычно
// и так примерно знает нужную категорию, полноценный browser ему не нужен,
// а 3-колоночная сетка физически не входит в узкую модалку (Tailwind
// `md:grid` триггерится шириной вьюпорта, а не контейнера — на десктопе
// она всё равно отрендерилась бы поверх узкой модалки). При этом реальная
// бизнес-логика — семантические подсказки при пустой выдаче
// (useCategorySearchSuggest) и догрузка CategoryFeature выбранной
// категории (useCategoryFeaturesLoader) — те же самые хуки, что использует
// и CategoryCascader, а не отдельная копия этой логики.
export const AdminCategorySearchField = ({
  categories,
  categoryId,
  onSelect,
  className
}: AdminCategorySearchFieldProps) => {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // В отличие от CategoryCascader, тут нет колоночного browser'а и
  // промежуточных категорий выбрать нельзя в принципе — в поиске всегда
  // только листья, поэтому фильтрация по !cat.hasChildren не зависит от
  // ширины экрана (isMobile), она такая всегда.
  const flatLeafCategories = useMemo(() => flattenCategories(categories).filter(cat => !cat.hasChildren), [categories])
  const otherCategory = useMemo(() => categories.find(c => c.name === 'Прочее'), [categories])
  const { suggestions: semanticSuggestions, isLoading: isSemanticLoading } = useCategorySearchSuggest(searchTerm)
  const loadCategoryFeatures = useCategoryFeaturesLoader()

  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return flatLeafCategories
    return flatLeafCategories.filter(cat => cat.path.join(' ').toLowerCase().includes(term))
  }, [flatLeafCategories, searchTerm])

  const isShowingSemanticSuggestions = filteredCategories.length === 0 && semanticSuggestions.length > 0

  const categoryPath = useMemo(() => {
    if (!categoryId) return []
    const path = getPathToCategory(categories, categoryId)
    return path.map(id => findCategoryById(categories, id)?.name).filter(Boolean) as string[]
  }, [categories, categoryId])

  const handleSelect = async (catId: string) => {
    setOpen(false)
    setIsLoading(true)

    const category = findCategoryById(categories, catId)
    const features = await loadCategoryFeatures(catId)

    setIsLoading(false)

    if (!features || !category) return

    onSelect(catId, features, category.priceUnits?.length ? category.priceUnits : ['ITEM'])
  }

  return (
    <div className={className}>
      <Command
        shouldFilter={false}
        className={cn('overflow-initial relative mb-3 rounded-lg border', open ? 'focus-input' : 'border')}
      >
        <CommandInput
          aria-label='Поиск категории'
          className='text-md p-0 placeholder:text-gray-500'
          placeholder={isLoading ? 'Загружаем категорию...' : 'Поиск категории'}
          disabled={isLoading}
          onFocus={() => {
            if (searchTerm.trim().length > 0) setOpen(true)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onValueChange={val => {
            setSearchTerm(val)
            setOpen(val.trim().length > 0)
          }}
        />
        <div
          className={cn(
            'absolute top-[calc(100%+10px)] left-0 z-10 w-full overflow-hidden rounded-lg border bg-white shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:bg-gray-50',
            !open && 'hidden'
          )}
        >
          <CommandList className='rounded-0 py-2'>
            <CommandEmpty className='flex flex-col items-center gap-2 px-3.5 py-6 text-center text-sm'>
              <div className='text-gray-500'>
                {isSemanticLoading ? (
                  <Loading className='relative' />
                ) : (
                  'Ничего не нашли. Попробуйте более простое или общее название товара.'
                )}
              </div>
              {otherCategory && (
                <button
                  type='button'
                  className='text-primary underline underline-offset-2 hover:no-underline'
                  onClick={() => handleSelect(otherCategory.id)}
                >
                  Или посмотрите категорию «Прочее»
                </button>
              )}
            </CommandEmpty>
            <CommandGroup heading={isShowingSemanticSuggestions ? '' : undefined}>
              {isShowingSemanticSuggestions
                ? semanticSuggestions.map(suggestion => (
                    <CommandItem
                      className='flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-100'
                      key={suggestion.id}
                      onSelect={() => handleSelect(suggestion.id)}
                    >
                      <div className='flex flex-wrap items-center gap-2.5'>
                        {suggestion.parentName && (
                          <div className='flex items-center gap-2.5'>
                            {suggestion.parentName}
                            <ChevronRight className='text-muted-foreground size-4 shrink-0' />
                          </div>
                        )}
                        {suggestion.name}
                      </div>
                    </CommandItem>
                  ))
                : filteredCategories.map(cat => (
                    <CommandItem
                      className='flex w-full cursor-pointer items-center gap-2 px-3.5 py-1 hover:bg-gray-50 dark:hover:bg-neutral-700'
                      key={cat.id}
                      onSelect={() => handleSelect(cat.id)}
                    >
                      <div className='flex flex-wrap items-center gap-2.5'>
                        {cat.path.map((name, index, arr) => (
                          <div key={index} className='flex items-center gap-2.5'>
                            {name}
                            {index < arr.length - 1 && (
                              <ChevronRight className='text-muted-foreground size-4 shrink-0' />
                            )}
                          </div>
                        ))}
                      </div>
                    </CommandItem>
                  ))}
            </CommandGroup>
          </CommandList>
        </div>
      </Command>

      {categoryPath.length > 0 && (
        <CategoryBreadcrumbs className='pt-0! pb-0' items={categoryPath.map(name => ({ name }))} mobileCollapse />
      )}
    </div>
  )
}
