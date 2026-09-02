'use client'

import { useTheme } from 'next-themes'
import Image from 'next/image'
import Link from 'next/link'

import { useMounted } from '@/shared/hooks'

import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
}

export const Logo = ({ className }: LogoProps) => {
  const { resolvedTheme } = useTheme()
  const mounted = useMounted()
  const logoSrc = mounted && resolvedTheme === 'dark' ? '/images/logo-white.svg' : '/images/logo.svg'

  return (
    <Link href='/' className={className}>
      <Image className={cn('h-auto w-30 lg:w-40', className)} src={logoSrc} width={100} height={40} alt='' priority />
      {/* <p className='text-secondary text-xs leading-3'>агропромышленная торговая площадка</p> */}
    </Link>
  )
}
