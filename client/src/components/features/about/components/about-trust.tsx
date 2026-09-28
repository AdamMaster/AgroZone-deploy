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
    <section className='bg-gray-50 py-20'>
      <Container>
        <div className='mb-10'>
          <Heading level={2} className='sm:text-4xl'>
            Как мы следим за порядком на площадке
          </Heading>
          <p className='mt-3 text-lg text-gray-500'>
            AgroZone только начинает расти — и с первого дня работает на доверии, а не на количестве объявлений.
          </p>
        </div>

        <div className='grid grid-cols-2 gap-8'>
          {TRUST_FEATURES.map(feature => (
            <div key={feature.title} className='custom-shadow dark:bg-card flex gap-4 rounded-3xl bg-white p-6'>
              <div className='bg-primary/10 text-primary mb-4 flex size-13 min-w-13 items-center justify-center rounded-xl'>
                <feature.icon className='size-8' />
              </div>
              <div>
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
