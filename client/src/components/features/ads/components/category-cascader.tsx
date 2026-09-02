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
import { findCategoryById, flattenCategories, getPathToCategory } from '@/shared/utils'

import { cn } from '@/lib/utils'

import { TypeCreateAdSchema } from '../schemes'
import { ICategory, ICategoryFeature } from '../types/ad.types'
import { CategoryBreadcrumbs } from './category-breadcrumbs'

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

  const filteredCategories = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    const source = isMobile ? flatCategories.filter(cat => !cat.hasChildren) : flatCategories

    if (!term) return source

    return source.filter(cat => cat.path.join(' ').toLowerCase().includes(term))
  }, [flatCategories, searchTerm, isMobile])

  const isShowingSemanticSuggestions = filteredCategories.length === 0 && semanticSuggestions.length > 0

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

  const handleCategorySelect = (catId: string) => {
    const path = getPathToCategory(categories, catId)
    setSelectedPath(path)

    const fullCategory = findCategoryById(categories, catId)

    if (fullCategory && (!fullCategory.children || fullCategory.children.length === 0)) {
      form.setValue('categoryId', catId, { shouldValidate: true })
      onCategorySelect(
        fullCategory.categoryFeatures || [],
        fullCategory.priceUnits?.length ? fullCategory.priceUnits : ['ITEM']
      )
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
            <CommandGroup heading={isShowingSemanticSuggestions ? '' : undefined}>
              {isShowingSemanticSuggestions
                ? semanticSuggestions.map(suggestion => (
                    <CommandItem
                      className='flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-1 hover:bg-gray-50 dark:hover:bg-gray-100'
                      key={suggestion.id}
                      onSelect={() => handleCategorySelect(suggestion.id)}
                    >
                      <div className='flex flex-wrap items-center gap-2.5'>
                        {suggestion.parentName && !isMobile && (
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
                      className='flex w-full cursor-pointer items-center justify-between gap-2 px-3.5 py-1 hover:bg-gray-50 dark:hover:bg-neutral-700'
                      key={cat.id}
                      onSelect={() => handleCategorySelect(cat.id)}
                    >
                      <div className='flex flex-wrap items-center gap-2.5'>
                        {(isMobile ? cat.path.slice(-1) : cat.path).map((name, index, arr) => (
                          <div key={index} className='flex items-center gap-2.5'>
                            {name}
                            {index < arr.length - 1 && (
                              <ChevronRight className='text-muted-foreground size-4 shrink-0' />
                            )}
                          </div>
                        ))}
                      </div>
                      {cat.hasChildren && (
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
