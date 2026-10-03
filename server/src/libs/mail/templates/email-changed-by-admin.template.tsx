import { Html } from '@react-email/html'
import { Body, Heading, Text, Link, Tailwind } from '@react-email/components'
import * as React from 'react'

interface EmailChangedByAdminTemplateProps {
  domain: string
  newEmail: string
}

// Уходит на СТАРЫЙ адрес после UserService.setEmailByAdmin, если он у
// пользователя был — симметрично PasswordChangedByAdminTemplate. Смена
// email, которым можно сбросить пароль и войти в аккаунт — такое же
// чувствительное действие, как и сама смена пароля, поэтому прежний
// владелец адреса должен об этом узнать, даже если сам не был инициатором.
export function EmailChangedByAdminTemplate({ domain, newEmail }: EmailChangedByAdminTemplateProps) {
  const supportLink = `${domain}/help`

  return (
    <Tailwind>
      <Html>
        <Body className='text-black'>
          <Heading as='h2'>Email аккаунта изменён администратором</Heading>
          <Text>
            Email, привязанный к вашему аккаунту на AgroZone, был изменён администратором сайта на {newEmail} —
            например, по вашей просьбе через поддержку.
          </Text>
          <Text className='text-gray-500'>
            Если вы не обращались за помощью и не ожидали этого письма — это может означать, что кто-то другой получил
            доступ к вашему аккаунту. Пожалуйста, срочно свяжитесь с поддержкой.
          </Text>
          <Link className='px-3 py-1.5 inline-block rounded-lg text-white mb-8 bg-[#5ea500]' href={supportLink}>
            Связаться с поддержкой
          </Link>
        </Body>
      </Html>
    </Tailwind>
  )
}
