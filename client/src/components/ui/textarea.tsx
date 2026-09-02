import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot='textarea'
      className={cn(
        'border-input disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex field-sizing-content min-h-30 w-full rounded-lg border bg-gray-50 px-2.5 py-2 text-base transition-colors outline-none group-data-[invalid=true]:border-red-500! placeholder:text-gray-500 hover:bg-gray-100 focus-visible:border-[#5da500] focus-visible:bg-white disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 md:text-sm dark:bg-gray-50',
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
