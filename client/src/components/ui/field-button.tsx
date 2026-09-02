import { PropsWithChildren } from 'react'

import { cn } from '@/lib/utils'

interface FieldButtonProps {
  className?: string
  onClick?: () => void
  disabled?: boolean
}

export const FieldButton = ({ className, children, onClick, disabled }: PropsWithChildren<FieldButtonProps>) => {
  return (
    <button
      type='button'
      disabled={disabled}
      className={cn(
        'hover:text-primary absolute top-1/2 right-0 -translate-y-1/2 px-4 text-sm disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
