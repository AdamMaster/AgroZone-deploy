'use client'

import { Menu } from 'lucide-react'

import { useCategoryMenuStore } from '../store'

export const CategoryMenuButton = () => {
  const { toggle, isOpen, open, close } = useCategoryMenuStore()

  const handleClick = () => {
    if (isOpen) close()
    else open()
  }

  return (
    <button
      className='bg-primary hover:bg-primary-foreground! focus:bg-primary-foreground! flex h-13 items-center gap-2 rounded-lg px-4 text-sm text-white'
      data-category-toggle
      onClick={handleClick}
    >
      <Menu className='size-6' />
      <span className='hidden lg:inline'>Категории</span>
    </button>
  )
}
