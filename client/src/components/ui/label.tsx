'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return (
    <label
      data-slot='label'
      className={cn(
        'mb-2.5 flex items-center gap-2 text-sm leading-none font-medium text-gray-900 select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 sm:mb-3 dark:text-white',
        className
      )}
      {...props}
    />
  )
}

export { Label }
