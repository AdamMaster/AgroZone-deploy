'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { Heading, Loading } from '@/components/ui'

import { useVerificationMutation } from '../hooks'

export const NewVerificationForm = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const { verification } = useVerificationMutation()

  useEffect(() => {
    verification(token)
  }, [token])

  return (
    <div className='max-w-lg rounded-xl border p-8 text-center'>
      <Heading level={3} className='mb-5'>
        Подтверждение почты
      </Heading>
      <Loading className='relative' />
    </div>
  )
}
