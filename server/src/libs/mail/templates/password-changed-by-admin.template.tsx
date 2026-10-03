import { Html } from '@react-email/html'
import { Body, Heading, Text, Link, Tailwind } from '@react-email/components'
import * as React from 'react'

interface PasswordChangedByAdminTemplateProps {
  domain: string
}

// Уходит после UserService.setPasswordByAdmin — единственное уведомление
// владельцу аккаунта о том, что его пароль сменил администратор (обычно по
// просьбе самого пользователя через поддержку, когда он потерял доступ).
// Намеренно НЕ содержит сам новый пароль — email не защищённый канал,
// присылать туда действующий пароль открытым текстом небезопасно (новый
// пароль администратор передаёт пользователю лично/через поддержку).
// Письмо нужно именно на случай, когда это были НЕ они — тогда это первый
// сигнал о компрометации аккаунта.
export function PasswordChangedByAdminTemplate({ domain }: PasswordChangedByAdminTemplateProps) {
  const supportLink = `${domain}/help`

  return (
    <Tailwind>
      <Html>
        <Body className='text-black'>
          <Heading as='h2'>Пароль изменён администратором</Heading>
          <Text>
            Пароль от вашего аккаунта на AgroZone был изменён администратором сайта — например, по вашей просьбе через
            поддержку, если вы потеряли доступ.
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
