'use client'

import { useAppModal } from '@/store'

import {
  Button,
  Field,
  FieldButton,
  FieldDescription,
  FieldGroup,
  Heading,
  Input,
  Label,
  Skeleton,
  Switch
} from '@/components/ui'

import { useProfile } from '@/shared/hooks'

import { UserRole } from '../../auth/types'
import { useTwoFactorMutation } from '../hooks/use-two-factor-mutation'

export const ContentSecurity = () => {
  const { user, isLoading } = useProfile()
  const { onOpen } = useAppModal()
  const { toggle2fa, isToggleLoading } = useTwoFactorMutation()

  return (
    <div className=''>
      <Heading level={2} className='mb-6'>
        Безопасность
      </Heading>
      <div className='relative flex flex-col gap-8'>
        <div>
          <Heading level={5} className='mb-4'>
            Пароль
          </Heading>
          {isLoading ? (
            <Skeleton className='rounded-1 h-11 w-full sm:h-12' />
          ) : (
            <Field>
              <div className='relative'>
                <Input readOnly placeholder={user?.password ? '••••••' : 'Пароль не установлен'}></Input>
                <FieldButton onClick={() => onOpen('change-password')}>
                  {user?.password ? 'Сменить пароль' : 'Установить пароль'}
                </FieldButton>
              </div>
            </Field>
          )}
        </div>
        <div>
          <Heading level={5} className='mb-4'>
            Двух-факторная аутентификация
          </Heading>
          {isLoading ? (
            <Skeleton className='rounded-1 h-17 w-full' />
          ) : (
            <Field className='group mt-4 rounded-lg border bg-gray-50 px-4 py-4'>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label>Двухфакторная аутентификация</Label>
                  <FieldDescription>
                    Включите двухфакторную аутентификацию, чтобы защитить свой аккаунт
                  </FieldDescription>
                </div>
                <Switch
                  checked={user?.isTwoFactorEnabled ?? false}
                  onCheckedChange={() => toggle2fa()}
                  disabled={isToggleLoading || isLoading}
                />
              </div>
            </Field>
          )}
        </div>

        {/* Администратору самоудаление недоступно — см. UserService.deleteAccount
            на сервере, тут просто скрываем саму возможность нажать. */}
        {!isLoading && user?.role !== UserRole.Admin && (
          <div>
            <Heading level={5} className='mb-4'>
              Удаление аккаунта
            </Heading>
            <Field className='rounded-lg border bg-gray-50 px-4 py-4'>
              <div className='flex items-center justify-between gap-4'>
                <div className='space-y-0.5'>
                  <Label>Удалить аккаунт</Label>
                  <FieldDescription>Действие необратимо — все данные аккаунта будут обезличены</FieldDescription>
                </div>
                <Button
                  type='button'
                  variant='destructive'
                  size='sm'
                  className='shrink-0'
                  onClick={() => onOpen('delete-account')}
                >
                  Удалить
                </Button>
              </div>
            </Field>
          </div>
        )}
      </div>
    </div>
  )
}
