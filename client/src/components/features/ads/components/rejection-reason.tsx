import { CircleAlert } from 'lucide-react'

import { cn } from '@/lib/utils'

interface RejectionReasonProps {
  text: string
  className?: string
}

export const RejectionReason = ({ text, className }: RejectionReasonProps) => {
  return (
    <div className={cn(className, 'flex w-fit items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-red-500')}>
      <CircleAlert className='size-4' />
      {/* text-sm, а не text-xs — это единственный контент компонента:
          настоящая причина отказа модератора, которую продавец должен
          прочитать и по которой действовать (аудит A1+A2, ROADMAP.md). */}
      <p className='text-sm'>{text}</p>
    </div>
  )
}
