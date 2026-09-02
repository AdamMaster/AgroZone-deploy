'use client'

import { type PropsWithChildren, ReactNode } from 'react'

import { Heading } from '@/components/ui'

import { cn } from '@/lib/utils'

import { AuthSocials } from './auth-socials'

interface AuthFormWrapperProps {
  className?: string
  heading: string
  description?: string
  switchButtonLabel?: ReactNode
  isShowSocial?: boolean
  onSwitchButtonClick?: () => void
  // Текст под кнопками входа через соцсети — используем на формах
  // регистрации для уведомления о согласии на обработку персональных данных
  // (152-ФЗ): у OAuth нет отдельного шага с чекбоксом, поэтому согласие
  // подразумевается продолжением через Google/Яндекс, о чём и предупреждает
  // этот текст (см. AuthService.extractProfileFromCode на сервере).
  socialsFooterNotice?: ReactNode
}

export const AuthFormWrapper = ({
  children,
  className,
  heading,
  description,
  switchButtonLabel,
  onSwitchButtonClick,
  isShowSocial = true,
  socialsFooterNotice
}: PropsWithChildren<AuthFormWrapperProps>) => {
  return (
    <div className={cn('flex w-full flex-col text-center', className)}>
      <div className='mb-8 flex flex-col gap-2'>
        <Heading level={2}>{heading}</Heading>
        {description && <p className='text-gray-500'>{description}</p>}
      </div>
      {children}
      {isShowSocial && (
        <div className='relative my-5 space-y-4'>
          <div className='relative flex justify-center text-xs uppercase'>
            <div className='absolute inset-0 flex items-center'>
              <span className='w-full border-t border-gray-300' />
            </div>
            <span className='bg-background z-10 px-2 text-gray-500'>ИЛИ</span>
          </div>
        </div>
      )}

      {/* <div>{isShowSocial && <AuthSocials />}</div> */}
      {isShowSocial && socialsFooterNotice && (
        <p className='text-muted-foreground mt-3 text-xs'>{socialsFooterNotice}</p>
      )}
      {switchButtonLabel && (
        <button className='mt-4 block w-full text-center hover:opacity-80' onClick={onSwitchButtonClick}>
          {switchButtonLabel}
        </button>
      )}
    </div>
  )
}
