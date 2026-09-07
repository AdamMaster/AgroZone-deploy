'use client'

import { Heart } from 'lucide-react'

import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  onClick: () => void
  isFavorite?: boolean
  isLoading?: boolean
  // Позиционирование/видимость самой кнопки (top-*/right-*/hidden и
  // т.п.) — размер области нажатия задаётся внутри компонента константой
  // ниже, сюда его передавать не нужно.
  className?: string
  // Размер именно иконки сердечка — намеренно ОТДЕЛЬНЫЙ от размера
  // кнопки-обёртки (см. ниже): аудит A1+A2 (ROADMAP.md) требует увеличить
  // тач-таргет, но не трогать то, что видно на экране. По умолчанию 20px
  // — столько же, сколько иконка занимала визуально и раньше (когда она
  // растягивалась на всю кнопку через size-full).
  iconClassName?: string
}

export const FavoriteButton = ({
  onClick,
  isFavorite = false,
  isLoading = false,
  className,
  iconClassName = 'size-5'
}: FavoriteButtonProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isLoading) return
    onClick?.()
  }

  return (
    <button
      type='button'
      onClick={handleClick}
      disabled={isLoading}
      aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
      aria-pressed={isFavorite}
      className={cn(
        // Область нажатия — 32px (минимум по аудиту A1+A2 — 24px, берём с
        // запасом под палец, а не под курсор мыши). Иконка внутри может
        // быть меньше — кликабельная зона вокруг неё в любом случае не
        // меньше этого размера.
        'absolute top-0 right-0 flex size-8 items-center justify-center transition-all active:scale-95 disabled:opacity-50',
        className
      )}
    >
      <Heart
        className={cn(
          'transition-colors',
          iconClassName,
          isFavorite ? 'fill-current text-red-500' : 'text-gray-400 hover:text-red-500'
        )}
      />
    </button>
  )
}
