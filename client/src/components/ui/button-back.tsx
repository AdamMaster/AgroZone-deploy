import { ArrowLeft } from 'lucide-react'

import { cn } from '@/lib/utils'

interface ButtonBack {
  className?: string
  onClick: () => void
  // Одно и то же действие "назад" во всех 8 местах использования — дефолт
  // покрывает их все, проп оставлен на случай, если где-то понадобится
  // более специфичная подпись (например "Закрыть предпросмотр").
  ariaLabel?: string
}

export const ButtonBack = ({ className, onClick, ariaLabel = 'Назад' }: ButtonBack) => {
  return (
    <button
      type='button'
      aria-label={ariaLabel}
      className={cn(
        'custom-shadow flex size-13 items-center justify-center bg-white sm:rounded-full dark:bg-neutral-800',
        className
      )}
      onClick={onClick}
    >
      <ArrowLeft className='font-bold' size={20} />
    </button>
  )
}
