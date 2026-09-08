import { Html } from '@react-email/html'
import { Body, Heading, Text, Link, Tailwind } from '@react-email/components'
import * as React from 'react'

interface NewMessageTemplateProps {
  domain: string
  conversationId: string
  adTitle: string
  senderName: string
  messageText: string
}

export function NewMessageTemplate({
  domain,
  conversationId,
  adTitle,
  senderName,
  messageText
}: NewMessageTemplateProps) {
  const conversationLink = `${domain}/profile/settings/messages?c=${conversationId}`

  return (
    <Tailwind>
      <Html>
        <Body className='text-black'>
          <Heading as='h2'>Новое сообщение</Heading>
          <Text>
            {senderName} написал(а) вам по объявлению «{adTitle}»:
          </Text>
          {messageText && <Text className='text-gray-500'>«{messageText}»</Text>}
          <Link className='px-3 py-1.5 inline-block rounded-lg text-white mb-8 bg-[#5ea500]' href={conversationLink}>
            Ответить
          </Link>
          <Text className='text-gray-500'>Спасибо за использование нашего сервиса!</Text>
        </Body>
      </Html>
    </Tailwind>
  )
}
