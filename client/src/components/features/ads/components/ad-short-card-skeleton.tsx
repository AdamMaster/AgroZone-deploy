import { Skeleton } from '@/components/ui'

export const AdShortCardSkeleton = () => {
  return (
    <div className='flex flex-col gap-4 md:flex-row'>
      <div className='flex gap-2.5 sm:gap-4'>
        <Skeleton className='relative flex h-20 w-22 flex-shrink-0 rounded-lg sm:h-24 sm:w-32 md:h-30 md:w-40' />

        <div className='flex flex-grow flex-col sm:w-90'>
          <Skeleton className='mb-2 h-3.5 w-35 rounded-lg sm:h-5' />
          <Skeleton className='mb-2 h-3.5 w-20 rounded-lg sm:h-5' />
          <Skeleton className='h-3.5 w-50 rounded-lg sm:h-5' />
        </div>
      </div>

      <div className='hidden w-full flex-col gap-2 sm:flex md:w-48'>
        <Skeleton className='h-10 rounded-lg' />
        <Skeleton className='h-10 rounded-lg' />
      </div>
    </div>
  )
}
