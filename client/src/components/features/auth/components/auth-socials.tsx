'use client'

import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { FaGoogle, FaYandex } from 'react-icons/fa'

import { Button } from '@/components/ui'

import { authService } from '../services'
import { type AuthProvider } from '../types'

export const AuthSocials = () => {
  const router = useRouter()

  const { mutateAsync } = useMutation({
    mutationKey: ['oauth by provider'],
    mutationFn: async (provider: AuthProvider) => await authService.oauthByProvider(provider)
  })

  const onClick = async (provider: AuthProvider) => {
    const response = await mutateAsync(provider)

    if (response) {
      router.push(response.url)
    }
  }

  return (
    <>
      <div className='grid grid-cols-2 gap-4'>
        {/* <Button size='lg' variant='outline' className='text-sm font-medium' onClick={() => onClick('google')}>
          <FaGoogle className='mr-1 size-4' />
          Google
        </Button> */}
        <Button size='lg' variant='outline' className='text-sm font-medium' onClick={() => onClick('yandex')}>
          <FaYandex className='mr-1 size-4' />
          Яндекс
        </Button>
      </div>
    </>
  )
}
