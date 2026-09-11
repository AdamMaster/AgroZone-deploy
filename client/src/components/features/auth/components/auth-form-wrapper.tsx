'use client'

import { type PropsWithChildren, ReactNode } from 'react'

import { Heading } from '@/components/ui'

import { cn } from '@/lib/utils'

import { AuthSocials } from './auth-socials'

export type AuthTabView = 'login' | 'register-sms'

interface AuthTabsProps {
  active: AuthTabView
  onSelect: (view: AuthTabView) => void
}

interface AuthFormWrapperProps {
  className?: string
  heading: string
  description?: string
  switchButtonLabel?: ReactNode
  isShowSocial?: boolean
  onSwitchButtonClick?: () => void
  // Переключатель «Войти» / «Регистрация» в виде крупных вкладок сверху
  // формы — замена мелкой ссылке снизу (switchButtonLabel выше). Раньше
  // единственным способом переключиться между входом и регистрацией была
  // мелкая ссылка под кнопками соцсетей, что делало регистрацию менее
  // заметной опцией. Показываем только когда передан явно — часть форм
  // (сброс пароля, новый пароль) вообще не участвуют в этом переключении.
  authTabs?: AuthTabsProps
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
  socialsFooterNotice,
  authTabs
}: PropsWithChildren<AuthFormWrapperProps>) => {
  return (
    <div className={cn('flex w-full flex-col text-center', className)}>
      {authTabs && (
        <div className='bg-muted mb-6 grid grid-cols-2 gap-1 rounded-lg p-1'>
          <button
            type='button'
            onClick={() => authTabs.active !== 'login' && authTabs.onSelect('login')}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              authTabs.active === 'login' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}
          >
            Войти
          </button>
          <button
            type='button'
            onClick={() => authTabs.active !== 'register-sms' && authTabs.onSelect('register-sms')}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors',
              authTabs.active === 'register-sms'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground'
            )}
          >
            Регистрация
          </button>
        </div>
      )}
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

      <div>{isShowSocial && <AuthSocials />}</div>
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
