import { Loader2 } from 'lucide-react'
import React from 'react'

import { cn } from '@/lib/utils'

interface LoadingProps {
  className?: string
  withText?: boolean
}

export function Loading({ className, withText = false }: LoadingProps) {
  return (
    <div
      className={cn(
        'absolute inset-0 flex h-full w-full flex-col items-center justify-center gap-1.5 bg-white/70 text-sm',
        className
      )}
    >
      <Loader2 className='text-primary size-6 animate-spin' />
      {withText && <span className='text-slate-500'>Загрузка...</span>}
    </div>
  )
}
