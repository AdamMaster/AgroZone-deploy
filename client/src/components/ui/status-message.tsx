import { CheckCircle } from 'lucide-react'

import { Heading } from './heading'

interface StatusMessageProps {
  heading: string
  text?: string
}

export const StatusMessage = ({ heading, text }: StatusMessageProps) => {
  return (
    <div className='flex flex-col items-center text-center'>
      <CheckCircle className='text-primary mb-5 size-8' />
      <Heading level={2} className='mb-3'>
        {heading}
      </Heading>
      <p className='text-gray-500'>{text}</p>
    </div>
  )
}
