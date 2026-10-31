import { Html } from '@react-email/html'
import { Body, Heading, Text, Link, Tailwind } from '@react-email/components'
import * as React from 'react'

interface DraftsExpiringTemplateProps {
  domain: string
  drafts: Array<{ id: string; title: string }>
  // «3 дня» — уже со склонением, собирает вызывающий код.
  timeLeft: string
}

export function DraftsExpiringTemplate({ domain, drafts, timeLeft }: DraftsExpiringTemplateProps) {
  return (
    <Tailwind>
      <Html>
        <Body className='text-black'>
          <Heading as='h2'>Черновики скоро удалятся</Heading>
          <Text>
            {drafts.length === 1
              ? 'Черновик не менялся почти месяц и будет удалён через '
              : 'Эти черновики не менялись почти месяц и будут удалены через '}
            {timeLeft}:
          </Text>
          {drafts.map(draft => (
            <Text key={draft.id} className='my-1'>
              <Link href={`${domain}/ads/${draft.id}/edit`}>«{draft.title}»</Link>
            </Text>
          ))}
          <Text className='text-gray-500'>
            Откройте черновик и опубликуйте его, если объявление ещё нужно. Любое сохранение продлевает срок хранения.
          </Text>
          <Link
            className='px-3 py-1.5 inline-block rounded-lg text-white mb-8 bg-[#5ea500]'
            href={`${domain}/profile/settings/ads`}
          >
            Мои объявления
          </Link>
          <Text className='text-gray-500'>Спасибо за использование нашего сервиса!</Text>
        </Body>
      </Html>
    </Tailwind>
  )
}
