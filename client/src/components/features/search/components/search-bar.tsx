'use client'

import { useFilterModal } from '@/store'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

import { Button, Input } from '@/components/ui'

import { cn } from '@/lib/utils'

import { useSearch } from '../hooks/use-search'

interface SearchBarProps {
  className?: string
}

export const SearchBar = ({ className }: SearchBarProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isFocus, setIsFocus] = useState<boolean>(false)

  const { query, setQuery, onSearch, suggestions } = useSearch()
  const { onOpen: onOpenFilterModal } = useFilterModal()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()

    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      router.push('/catalog')
      return
    }

    router.push(`/catalog?search=${encodeURIComponent(trimmedQuery)}`)

    setIsFocus(false)

    const activeElement = document.activeElement as HTMLElement
    activeElement?.blur()

    setIsFocus(false)
  }

  const handleInputChange = (value: string) => {
    setQuery(value)
    onSearch(value)
  }

  const onClear = () => {
    setQuery('')

    const params = new URLSearchParams(searchParams.toString())
    params.delete('search')

    router.push(`${pathname}?${params.toString()}`)
  }

  const onClickButton = () => {
    setIsFocus(false)
  }

  // Мобильная версия: вместо кнопки submit (лупа) — кнопка фильтра (см.
  // обсуждение с пользователем: поиск на всю ширину, кнопки «Найти»
  // отдельно не нужно — пользователь просто кликает пункт из списка
  // подсказок). Кнопка открывает FilterModal (@/components/modals/filter)
  // — тот же <Filter>, что и в сайдбаре десктопного каталога, только во
  // весь экран. Выше md кнопка скрыта (см. className ниже), поэтому окно
  // физически не может открыться на широком экране.
  const onClickFilter = () => {
    setIsFocus(false)
    onOpenFilterModal()
  }

  const onClickInput = () => {
    setIsFocus(true)
  }

  return (
    <div className={cn(className, 'flex items-center')}>
      <form
        className={cn(
          'md:bg-primary relative z-100 flex w-full items-center rounded-lg bg-gray-100 p-[2px]',
          isFocus && 'bg-white'
        )}
        onSubmit={handleSearch}
      >
        <div className='relative w-full'>
          <Input
            value={query}
            placeholder='Поиск по объявлениям'
            onChange={e => handleInputChange(e.target.value)}
            onClick={() => onClickInput()}
            className='h-10 w-full rounded-[10px] border-0 bg-transparent pl-3 transition-none focus-visible:border-transparent md:h-12 md:bg-white md:pl-4 md:pl-5 md:text-[15px]! md:transition-colors!'
            autoComplete='off'
          />

          {query.length > 0 && (
            <button
              type='button'
              onClick={() => onClear()}
              className='absolute top-0 right-0 flex h-full items-center justify-center px-3'
            >
              <X className='size-5 text-base hover:text-inherit md:text-gray-400' />
            </button>
          )}
        </div>

        <Button
          type='submit'
          variant='default'
          className='text-md hidden h-12! px-5 font-normal md:flex'
          onClick={() => onClickButton()}
        >
          <Search className={cn('size-5 text-white')} />
        </Button>

        <Button
          type='button'
          aria-label='Открыть фильтр'
          onClick={() => onClickFilter()}
          className='flex h-10 shrink-0 items-center justify-center bg-transparent px-2.5 md:hidden'
        >
          <SlidersHorizontal className='size-5 text-gray-500' />
        </Button>

        {isFocus && suggestions.length > 0 && (
          <div className='custom-shadow absolute top-[calc(100%+4px)] left-0 z-100 max-h-64 w-full overflow-hidden overflow-y-auto rounded-lg bg-white'>
            <ul className='py-2'>
              {suggestions.map(item => (
                <li
                  key={item.id}
                  onClick={() => {
                    setQuery(item.name)
                    setIsFocus(false)

                    const activeElement = document.activeElement as HTMLElement
                    activeElement?.blur()

                    router.push(item.url)
                  }}
                  className='flex cursor-pointer items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-gray-50'
                >
                  {item.type !== 'category' && <Search className='size-4 shrink-0' />}

                  <div className='flex items-center gap-1'>
                    <span className='font-medium'>{item.name}</span>
                    <ChevronRight className='size-4 shrink-0 text-gray-500' />
                    {item.type === 'category' && item.parentName && (
                      <span className='text-gray-500'>{item.parentName}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
      <Button
        variant='ghost'
        className={cn('relative z-100 hidden bg-transparent pr-0 text-xs font-normal md:hidden', isFocus && 'block')}
        onClick={() => setIsFocus(false)}
      >
        Отменить
      </Button>
      {isFocus && <div className='fixed inset-0 z-50 h-full w-full bg-black/20' onClick={() => setIsFocus(false)} />}
    </div>
  )
}
