'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'

import { Heading, Loading } from '@/components/ui'

import { useChangeEmailConfirmMutation } from '../hooks'

export const EmailChangeConfirm = () => {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const { confirmChange } = useChangeEmailConfirmMutation()

  const hasCalled = useRef(false)

  useEffect(() => {
    if (token && !hasCalled.current) {
      confirmChange()
      hasCalled.current = true
    }
  }, [token, confirmChange])

  return (
    <div className='max-w-lg rounded-xl border p-8 text-center'>
      <Heading level={3} className='mb-5'>
        Подтверждение почты
      </Heading>
      <Loading className='relative' />
    </div>
  )
}
