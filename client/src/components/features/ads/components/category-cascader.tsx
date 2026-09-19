'use client'

import { useAdStore } from '@/store'
import { CommandItem } from 'cmdk'
import { ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'

import { useCategorySearchSuggest } from '@/components/features/categories/hooks/use-category-search-suggest'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  Heading,
  Loading,
  ScrollArea
} from '@/components/ui'

import { useMediaQuery } from '@/shared/hooks'
import { findCategoryById, flattenCategories, getPathToCategory, sharesRussianStem } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { useCategoryFeaturesLoader } from '../hooks/use-category-features-loader'
import { TypeCreateAdSchema } from '../schemes'
import { ICategory, ICategoryFeature } from '../types/ad.types'
import { CategoryBreadcrumbs } from './category-breadcrumbs'

interface CascaderSuggestion {
  id: string
  displayParts: string[]
  hasChildren: boolean
}

interface CategoryCascaderProps {
  categories: ICategory[]
  form: UseFormReturn<TypeCreateAdSchema>
  onCategorySelect: (features: ICategoryFeature[], priceUnits: string[]) => void
}

export const CategoryCascader = ({ categories, form, onCategorySelect }: CategoryCascaderProps) => {
  const [selectedPath, setSelectedPath] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const flatCategories = useMemo(() => flattenCategories(categories), [categories])
  const listRef = useRef<HTMLDivElement>(null)
  const setCategoryPath = useAdStore(state => state.setCategoryPath)
  const categoryPath = useAdStore(state => state.categoryPath)
  const categoryId = form.watch('categoryId')
  const otherCategory = useMemo(() => categories.find(c => c.name === 'Прочее'), [categories])
  const { suggestions: semanticSuggestions, isLoading: isSemanticLoading } = useCategorySearchSuggest(searchTerm)
  const isMobile = useMediaQuery('(max-width: 767px)')
  const loadCategoryFeatures = useCategoryFeaturesLoader()

  // Помимо точного вхождения подстроки (дёшево и предсказуемо — работает
  // как раньше для фраз и полных совпадений), добавлена проверка по
  // словоформам (sharesRussianStem, см. shared/utils/text-similarity.ts):
  // раньше "груша" вообще не находил категорию "Груши" (буквально не
  // подстрока друг друга — падеж/число отличаются последней буквой),
  // filteredCategories оставался пустым, и включался фолбэк на
  // семантические подсказки, у которых для такого короткого запроса свои
  // проблемы с ранжированием (см. обсуждение с пользователем). Проверяем
  // "каждое слово запроса совпадает (буквально или по основе) хотя бы с
  // одним словом пути" — а не только "весь запрос — подстрока всего пути"
  // — чтобы порядок/число слов в запросе не имели значения.
  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const source = isMobile ? flatCategories.filter(cat => !cat.hasChildren) : flatCategories

    if (!term) return source

    const queryWords = term.split(/\s+/)

    return source.filter(cat => {
      const pathText = cat.path.join(' ').toLowerCase()

      if (pathText.includes(term)) return true

      const pathWords = pathText.split(/\s+/)

      return queryWords.every(queryWord => pathWords.some(pathWord => sharesRussianStem(queryWord, pathWord)))
    })
  }, [flatCategories, searchTerm, isMobile])

  // Раньше это был переключатель "или-или" (isShowingSemanticSuggestions):
  // семантика показывалась ТОЛЬКО когда литеральный фильтр не находил
  // вообще ничего, а как только он находил хоть одно (пусть даже случайное)
  // совпадение — семантика пряталась целиком, даже если у неё был более
  // точный результат. Теперь оба источника объединяются в один список:
  // сначала локальные (точные/по словоформе — они увереннее), затем
  // семантические, которых ещё нет среди локальных (см. searchBySemantic
  // на сервере — там только листовые категории, поэтому hasChildren у них
  // всегда false и кнопки "Уточнить" не бывает).
  const mergedSuggestions = useMemo<CascaderSuggestion[]>(() => {
    const local: CascaderSuggestion[] = filteredCategories.map(cat => ({
      id: cat.id,
      displayParts: isMobile ? cat.path.slice(-1) : cat.path,
      hasChildren: cat.hasChildren
    }))

    const localIds = new Set(local.map(item => item.id))

    const semantic: CascaderSuggestion[] = semanticSuggestions
      .filter(suggestion => !localIds.has(suggestion.id))
      .map(suggestion => ({
        id: suggestion.id,
        displayParts: suggestion.parentName && !isMobile ? [suggestion.parentName, suggestion.name] : [suggestion.name],
        hasChildren: false
      }))

    return [...local, ...semantic]
  }, [filteredCategories, semanticSuggestions, isMobile])

  const categoryButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const columns = useMemo(() => {
    const result: ICategory[][] = [categories]
    for (const selectedId of selectedPath) {
      const parentColumn = result[result.length - 1]
      const selectedCategory = parentColumn?.find(c => c.id === selectedId)
      if (selectedCategory?.children?.length) {
        result.push(selectedCategory.children)
      } else break
    }
    return result
  }, [selectedPath, categories])

  const handleCategorySelect = async (catId: string) => {
    const path = getPathToCategory(categories, catId)
    setSelectedPath(path)

    const fullCategory = findCategoryById(categories, catId)

    if (fullCategory && (!fullCategory.children || fullCategory.children.length === 0)) {
      // Атрибуты категории больше не лежат в дереве (см. комментарий у
      // ICategory.categoryFeatures) — их нужно догрузить отдельным запросом,
      // см. useCategoryFeaturesLoader (тот же хук использует и
      // AdminCategorySearchField в админке — см. SetAdCategoryDialog).
      // categoryId намеренно НЕ проставляется в форму до того, как запрос
      // разрешится — пока categoryId пуст, кнопка "Продолжить" в AdForm
      // (следит за form.watch('categoryId')) остаётся недоступной сама
      // по себе, без отдельного пропа под состояние загрузки.
      const features = await loadCategoryFeatures(catId)
      if (!features) return

      onCategorySelect(features, fullCategory.priceUnits?.length ? fullCategory.priceUnits : ['ITEM'])
      form.setValue('categoryId', catId, { shouldValidate: true })
      const pathNames = path.map(id => findCategoryById(categories, id)?.name).filter(Boolean) as string[]
      setCategoryPath(pathNames)
    } else {
      form.setValue('categoryId', '', { shouldValidate: true })
      form.setValue('categoryFeatures', {})
      onCategorySelect([], ['ITEM'])
    }
    setOpen(false)
  }

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0
    }
  }, [searchTerm])

  useEffect(() => {
    selectedPath.forEach(id => {
      categoryButtonRefs.current.get(id)?.scrollIntoView({ block: 'nearest' })
    })
  }, [selectedPath])

  return (
    <div>
      <Heading level={4} className='mb-2.5 font-medium'>
        Выберите категорию
      </Heading>
      <Command
        shouldFilter={false}
        className={cn('overflow-initial relative mb-3 rounded-lg border', open ? 'focus-input' : 'border')}
      >
        <CommandInput
          aria-label='Поиск нужной категории'
          className='text-md p-0 placeholder:text-gray-500'
          placeholder='Поиск нужной категории'
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
          <CommandList className='rounded-0 py-2' ref={listRef}>
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
                  onClick={() => handleCategorySelect(otherCategory.id)}
                >
                  Или посмотрите категорию «Прочее»
                </button>
              )}
            </CommandEmpty>
            <CommandGroup>
              {mergedSuggestions.map(item => (
                <CommandItem
                  className='flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-1 hover:bg-gray-50 dark:hover:bg-neutral-700'
                  key={item.id}
                  onSelect={() => handleCategorySelect(item.id)}
                >
                  <div className='flex flex-wrap items-center gap-2.5'>
                    {item.displayParts.map((name, index, arr) => (
                      <div key={index} className='flex items-center gap-2.5'>
                        {name}
                        {index < arr.length - 1 && <ChevronRight className='text-muted-foreground size-4 shrink-0' />}
                      </div>
                    ))}
                  </div>
                  {item.hasChildren && (
                    <span className='flex shrink-0 items-center gap-1 text-xs text-gray-400'>
                      Уточнить
                      <ChevronRight className='size-3.5' />
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </div>
      </Command>
      {categoryId && categoryPath.length > 0 && (
        <CategoryBreadcrumbs
          className='pt-0! pb-0 sm:ml-4 sm:pb-6!'
          items={categoryPath.map(name => ({ name }))}
          mobileCollapse
        />
      )}
      <div className='space-y-2'>
        <div className='hidden grid-cols-3 gap-1 md:grid'>
          {columns.map((columnCategories, columnIndex) => (
            <ScrollArea key={columnIndex} className='h-[400px] pr-2.5'>
              {columnCategories.map(cat => {
                const isSelected = selectedPath[columnIndex] === cat.id
                const hasChildren = cat.children && cat.children.length > 0

                return (
                  <button
                    key={cat.id}
                    ref={el => {
                      if (el) categoryButtonRefs.current.set(cat.id, el)
                      else categoryButtonRefs.current.delete(cat.id)
                    }}
                    type='button'
                    onClick={() => {
                      const newPath = [...selectedPath.slice(0, columnIndex), cat.id]
                      setSelectedPath(newPath)
                      handleCategorySelect(cat.id)
                    }}
                    className={cn(
                      'relative flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors hover:bg-gray-50',
                      isSelected && 'bg-gray-100'
                    )}
                  >
                    <span>{cat.name}</span>
                    {hasChildren && <ChevronRight className='absolute top-[50%] right-2 size-5 translate-y-[-50%]' />}
                  </button>
                )
              })}
            </ScrollArea>
          ))}
        </div>

        {/* <Controller
          name='categoryId'
          control={form.control}
          render={({ fieldState }) => <>{fieldState.invalid && <FieldError errors={[fieldState.error]} />}</>}
        /> */}
      </div>
    </div>
  )
}
