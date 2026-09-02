'use client'

import { useFilterModal } from '@/store'

import { useCategories } from '@/components/features/categories/hooks/use-categories'
import { Filter } from '@/components/features/filter/components'
import { useCatalogFilters } from '@/components/features/filter/hooks/use-catalog-filters'
import { Button, Heading, ScrollArea } from '@/components/ui'
import { Dialog, DialogContent } from '@/components/ui/dialog'

// Открывается кнопкой фильтра в SearchBar (видна только до md, см.
// search-bar.tsx) — переиспользует тот же <Filter>, что и сайдбар каталога
// на десктопе, просто во весь экран. Кнопка-триггер существует только
// ниже md, поэтому адаптивная стилизация под десктоп здесь не нужна — окно
// физически не может открыться на широком экране.
export const FilterModal = () => {
  const { isOpen, onClose } = useFilterModal()
  const { categories } = useCategories()
  // immediate: false — выбор/ввод в любом поле копится локально, а не
  // сразу летит в URL (навигация/рефетч на каждый чих на мобилке — не то,
  // что нужно). Реально применяется одним разом только по "Показать".
  const filters = useCatalogFilters({ immediate: false })

  // Цена коммитится по onBlur (см. PriceRangeFilter в filter.tsx) — если
  // тапнуть "Показать" сразу после ввода, не убирая фокус с поля явным
  // образом, порядок blur→click не везде гарантирован одинаково (особенно
  // на мобилках с открытой клавиатурой). Снимаем фокус вручную перед
  // применением — тот же приём, что и в SearchBar — чтобы введённая цена
  // гарантированно успела попасть в буфер до apply().
  const onClickShow = () => {
    const activeElement = document.activeElement as HTMLElement
    activeElement?.blur()

    filters.apply()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='top-0 right-0 bottom-0 left-0 flex max-w-none translate-x-0 translate-y-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent flex-col gap-0 overflow-hidden overflow-y-auto rounded-none border-none p-4'>
        <Heading level={2} className='mb-6 pr-10 text-xl font-bold'>
          Фильтры
        </Heading>
        <Button
          className='absolute top-2 right-10 bg-transparent text-base text-black sm:hidden'
          onClick={filters.reset}
        >
          Сбросить
        </Button>

        <ScrollArea className='min-h-0 flex-1'>
          <Filter categories={categories} filters={filters} />
        </ScrollArea>

        <Button onClick={onClickShow} size='lg' variant='secondary' className='mt-4 w-full shrink-0'>
          Показать
        </Button>
      </DialogContent>
    </Dialog>
  )
}
