'use client'

import { useCategoriesModal } from '@/store'

import { CategoryList } from '@/components/features/categories/components'
import { Dialog, DialogContent } from '@/components/ui/dialog'

// Мобилка — окно на весь экран, без скруглений и внешних отступов (общее
// и для тапа по плитке категории верхнего уровня на главной, и для кнопки
// «Все категории» на /catalog/...). Десктоп — как было: центрированная
// карточка со скруглениями.
export const CategoriesModal = () => {
  const { isOpen, onClose } = useCategoriesModal()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='top-0 right-0 bottom-0 left-0 max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-none p-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent overflow-hidden overflow-y-auto md:top-1/2 md:left-1/2 md:right-auto md:bottom-auto md:h-auto md:max-h-[calc(100%_-_40px)] md:w-[calc(100%_-_40px)] md:max-w-280 md:-translate-x-1/2 md:-translate-y-1/2 md:gap-4 md:rounded-3xl md:p-10'>
        <CategoryList />
      </DialogContent>
    </Dialog>
  )
}
