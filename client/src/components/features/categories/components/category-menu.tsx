'use client'

import { ChevronRight } from 'lucide-react'
import * as Icons from 'lucide-react'
import { Folder, type LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { Container } from '@/components/layout'
import { Heading, Loading } from '@/components/ui'

import { useClickOutside } from '@/shared/hooks'

import { useCategories } from '../hooks/use-categories'
import { useCategoryMenuStore } from '../store'
import { ICategory } from '../types'

interface CategoryIconProps {
  name: string | null
  className?: string
}

function useActiveCategory(categories?: ICategory[]) {
  const initialId = categories?.[0]?.id ?? null

  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)

  const effectiveActiveId = activeCategoryId ?? initialId

  const activeCategory = useMemo(() => {
    if (!categories || !effectiveActiveId) return null
    return categories.find(c => c.id === effectiveActiveId) ?? null
  }, [categories, effectiveActiveId])

  return {
    activeCategoryId: effectiveActiveId,
    setActiveCategoryId,
    activeCategory
  }
}

const CategoryIcon = ({ name, className }: CategoryIconProps) => {
  const Icon = name && name in Icons ? (Icons[name as keyof typeof Icons] as LucideIcon) : Folder

  return <Icon className={className} />
}

export const CategoryMenu = () => {
  const { isOpen, close } = useCategoryMenuStore()
  const { categories, isLoadingCategories } = useCategories()

  const menuRef = useRef<HTMLDivElement | null>(null)

  const { activeCategoryId, setActiveCategoryId, activeCategory } = useActiveCategory(categories)

  useLayoutEffect(() => {
    const header = document.querySelector('header')
    if (!header) return

    const update = () => {
      document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`)
    }

    update()

    const observer = new ResizeObserver(update)
    observer.observe(header)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    document.body.classList.toggle('overflow-hidden', isOpen)
    return () => document.body.classList.remove('overflow-hidden')
  }, [isOpen])

  useClickOutside([menuRef], close, isOpen, '[data-category-toggle]')

  if (!isOpen) return null
  if (typeof window === 'undefined') return null

  return createPortal(
    <>
      <div
        className='animate-in fade-in-0 fixed top-[var(--header-height)] right-0 bottom-0 left-0 z-40 bg-black/30 duration-150'
        onClick={close}
        aria-hidden='true'
      />
      <div ref={menuRef} className='fixed top-[var(--header-height)] left-0 z-50 w-full pb-6'>
        <div className='h-full bg-white dark:bg-neutral-800'>
          <Container>
            <div className='mx-[-16px] grid h-full max-w-7xl grid-cols-[340px_1fr] overflow-hidden'>
              <div className='relative flex flex-col overflow-y-auto py-6'>
                {isLoadingCategories ? (
                  <Loading />
                ) : (
                  categories?.map(category => {
                    const isActive = category.id === activeCategoryId

                    return (
                      <button
                        key={category.id}
                        onMouseEnter={() => setActiveCategoryId(category.id)}
                        className={[
                          'relative flex w-full gap-3 rounded-lg px-4 py-3 pr-8 text-left text-[15px] font-medium',
                          isActive ? 'bg-gray-100' : ''
                        ].join(' ')}
                      >
                        <CategoryIcon
                          name={category.iconId ? category.iconId : ''}
                          className='text-primary size-5 min-w-5'
                        />
                        <span>{category.name}</span>

                        <ChevronRight className='absolute top-3.5 right-2 size-4' />
                      </button>
                    )
                  })
                )}
              </div>

              <div className='h-full overflow-y-auto p-8'>
                {activeCategory ? (
                  <>
                    <Heading level={3} className='mb-4'>
                      {activeCategory.name}
                    </Heading>

                    {activeCategory.children?.length ? (
                      <div className='columns-3 gap-x-6'>
                        {activeCategory.children.map(child => (
                          <Link
                            key={child.id}
                            href={`/catalog/${child.fullPath}`}
                            onClick={close}
                            className='hover:text-primary mb-4 block text-[15px] transition-colors'
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className='py-4 text-sm text-gray-400 italic'>В этом разделе пока нет подкатегорий</div>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          </Container>
        </div>
      </div>
    </>,
    document.body
  )
}
