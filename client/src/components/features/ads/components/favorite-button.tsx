'use client'

import { Heart } from 'lucide-react'

import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  onClick: () => void
  isFavorite?: boolean
  isLoading?: boolean
  className?: string
}

export const FavoriteButton = ({ onClick, isFavorite = false, isLoading = false, className }: FavoriteButtonProps) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isLoading) return
    onClick?.()
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn('absolute top-0 right-0 size-5 transition-all active:scale-95 disabled:opacity-50', className)}
    >
      <Heart
        className={`size-full transition-colors ${isFavorite ? 'fill-current text-red-500' : 'text-gray-400 hover:text-red-500'}`}
      />
    </button>
  )
}
