import { Html } from '@react-email/html'
import { Body, Heading, Text, Link, Tailwind } from '@react-email/components'
import * as React from 'react'

interface SupportMessageTemplateProps {
  domain: string
  fromLabel: string
  text: string
}

// Письмо уходит ТОЛЬКО на первое сообщение нового тикета (см.
// SupportService.createMessage) — дальнейшая переписка идёт в самом
// виджете/сокете, дублировать её на почту не нужно, поэтому текст без
// "ответить прямо на это письмо" — отвечать нужно на сайте.
//
// Ссылка ведёт на domain, а не на отдельный "/admin/support" — у виджета
// поддержки нет отдельной страницы, это плавающая кнопка, доступная с
// любой страницы сайта (см. SupportChatWidget), в том числе и админу.
export function SupportMessageTemplate({ domain, fromLabel, text }: SupportMessageTemplateProps) {
  return (
    <Tailwind>
      <Html>
        <Body className='text-black'>
          <Heading as='h2'>Новое обращение в поддержку</Heading>
          <Text className='text-gray-500'>От: {fromLabel}</Text>
          <Text className='py-2 px-4 bg-gray-100 rounded-lg'>{text}</Text>
          <Link className='px-3 py-1.5 inline-block rounded-lg text-white mb-8 bg-[#5ea500]' href={domain}>
            Открыть сайт
          </Link>
        </Body>
      </Html>
    </Tailwind>
  )
}
