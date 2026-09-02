'use client'

import { type PropsWithChildren, ReactNode } from 'react'

import { Heading } from '@/components/ui'

import { cn } from '@/lib/utils'

interface UserFormWrapperProps {
  className?: string
  heading: string
  description?: string
  onSwitchButtonClick?: () => void
}

export const UserFormWrapper = ({
  children,
  className,
  heading,
  description
}: PropsWithChildren<UserFormWrapperProps>) => {
  return (
    <div className={cn('flex w-full flex-col', className)}>
      <div className='mb-8 flex flex-col gap-2'>
        <Heading level={2}>{heading}</Heading>
        {description && <p className='text-gray-500'>{description}</p>}
      </div>
      {children}
    </div>
  )
}
