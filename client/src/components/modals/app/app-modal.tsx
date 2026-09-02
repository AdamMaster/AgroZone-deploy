'use client'

import { useAppModal } from '@/store'

import { FormAddPhone } from '@/components/features/ads/components'
import { StatusMessage } from '@/components/ui'
import { Dialog, DialogContent } from '@/components/ui/dialog'

import {
  FormDeleteAccount,
  FormEmailChange,
  FormLogin,
  FormPasswordChange,
  FormRegister,
  FormRegisterSms,
  FormResetPassword
} from '../../features'

export const AppModal = () => {
  const { isOpen, view, props, onClose } = useAppModal()

  const renderContent = () => {
    switch (view) {
      case 'register':
        return <FormRegister />
      case 'register-sms':
        return <FormRegisterSms />
      case 'login':
        return <FormLogin />
      case 'login-after-reset':
        return <FormLogin isShowSocial={false} />
      case 'new-password':
        return <FormResetPassword />
      case 'change-password':
        return <FormPasswordChange />
      case 'delete-account':
        return <FormDeleteAccount />
      case 'change-email':
        return <FormEmailChange />
      case 'add-phone':
        return <FormAddPhone {...props} />
      case 'code-message':
        return (
          <StatusMessage heading='Проверьте почту' text='На вашу почту была отправлена ссылка для подтверждения.' />
        )
      case 'change-email-message':
        return <StatusMessage heading='Запрос отправлен' text='Проверьте новую почту для подтверждения изменений.' />
      case 'register-message':
        return (
          <StatusMessage
            heading='Регистрация прошла успешно!'
            text='Пожалуйста, подтвердите ваш email. Сообщение было отправлено на ваш почтовый адрес.'
          />
        )
      case 'register-sms-message':
        return <StatusMessage heading='Регистрация прошла успешно!' text='Вы вошли в систему.' />
      case 'change-password-confirm':
        return <StatusMessage heading='Пароль обновлен!' text='Ваши данные успешно сохранены.' />
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='max-w-105 overflow-hidden border-none p-8'>{renderContent()}</DialogContent>
    </Dialog>
  )
}
