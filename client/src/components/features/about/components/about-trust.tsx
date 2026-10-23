import { Flag, KeyRound, MailCheck, ShieldCheck } from 'lucide-react'
import { ComponentType } from 'react'

import { Container } from '@/components/layout'
import { Heading } from '@/components/ui'

interface TrustFeature {
  icon: ComponentType<{ className?: string }>
  title: string
  description: string
}

const TRUST_FEATURES: TrustFeature[] = [
  {
    icon: ShieldCheck,
    title: 'Модерация каждого объявления',
    description:
      'Ни одно объявление не публикуется автоматически — сначала его проверяет модератор, и только потом оно появляется в каталоге. Если что-то не так, продавец увидит причину и сможет всё поправить.'
  },
  {
    icon: MailCheck,
    title: 'Подтверждение почты',
    description: 'Каждый аккаунт подтверждает адрес электронной почты при регистрации.'
  },
  {
    icon: KeyRound,
    title: 'Двухфакторная аутентификация',
    description: 'Можно включить дополнительный код при входе — по желанию, в настройках профиля.'
  },
  {
    icon: Flag,
    title: 'Жалобы на объявления',
    description: 'Если объявление выглядит подозрительно, на него можно пожаловаться — мы оперативно проверим.'
  }
]

export const AboutTrust = () => {
  return (
    <section className='bg-gray-50 py-14 sm:py-20'>
      <Container>
        <div className='mb-8 sm:mb-10'>
          <Heading level={2} className='sm:text-4xl'>
            Как мы следим за порядком на площадке
          </Heading>
          <p className='mt-3 text-base text-gray-500 sm:text-lg'>
            AgroZone только начинает расти — и с первого дня работает на доверии, а не на количестве объявлений.
          </p>
        </div>

        <div className='grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-8'>
          {TRUST_FEATURES.map(feature => (
            <div
              key={feature.title}
              className='custom-shadow dark:bg-card flex flex-col gap-4 rounded-3xl bg-white p-5 sm:flex-row sm:p-6'
            >
              <div className='bg-primary/10 text-primary flex size-13 min-w-13 items-center justify-center rounded-xl sm:mb-4'>
                <feature.icon className='size-8' />
              </div>
              <div className='min-w-0'>
                <Heading level={4}>{feature.title}</Heading>
                <p className='mt-1.5 text-gray-500'>{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
