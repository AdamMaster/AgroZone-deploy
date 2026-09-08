import { PropsWithChildren } from 'react'

import { cn } from '@/lib/utils'

interface ContainerProps {
  className?: string
}

// max-w-360 = 360 * 0.25rem (см. --spacing в globals.css) = 90rem = 1440px —
// по просьбе аудита (U12 в ROADMAP.md) сузили с прежних 1376px (max-w-344)
// до ровно 1440px, чтобы контент не расползался слишком широко на больших
// мониторах.
export const Container = ({ children, className }: PropsWithChildren<ContainerProps>) => {
  return <div className={cn('mx-auto max-w-360 px-4 md:px-5', className)}>{children}</div>
}
