import Link from 'next/link'
import { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface DashboardStatCardProps {
  title: string
  value: string
  hint?: ReactNode
  // Карточка очереди ведёт в соответствующий раздел админки.
  href?: string
  // Подсветка очереди, в которой есть что разобрать. Не единственный
  // признак: то же говорит и число, и подпись.
  needsAttention?: boolean
}

export const DashboardStatCard = ({ title, value, hint, href, needsAttention }: DashboardStatCardProps) => {
  const className = cn(
    'block rounded-md bg-mist-700/30 p-4',
    needsAttention && 'ring-1 ring-amber-400/60',
    href && 'transition-colors hover:bg-mist-700/50'
  )

  const content = (
    <>
      <p className='text-xs text-mist-400'>{title}</p>
      <p className='mt-1 text-2xl font-semibold tabular-nums'>{value}</p>
      {hint && <p className='mt-1 text-xs text-mist-300'>{hint}</p>}
    </>
  )

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  )
}
