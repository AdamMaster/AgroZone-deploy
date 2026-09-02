import { PropsWithChildren } from 'react'

import { cn } from '@/lib/utils'

interface ContainerProps {
  className?: string
}

export const Container = ({ children, className }: PropsWithChildren<ContainerProps>) => {
  return <div className={cn('mx-auto max-w-344 px-4 md:px-5', className)}>{children}</div>
}
