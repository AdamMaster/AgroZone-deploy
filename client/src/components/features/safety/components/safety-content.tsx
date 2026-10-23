import Link from 'next/link'

import { GuidePage, SupportContacts } from '@/components/layout'

import { SAFETY_SECTIONS } from '../constants/safety-sections'

const LEAD =
  'Практические рекомендации для покупателей и продавцов агропромышленной продукции, техники и услуг: как проверить контрагента и товар, безопасно оплатить сделку, распознать мошенников и что делать, если вас обманули.'

export const SafetyContent = () => {
  return (
    <GuidePage
      title='Безопасность'
      lead={LEAD}
      notice={
        <p>
          Материал носит информационный характер и не является юридической консультацией. AgroZone — информационная
          площадка: она не участвует в сделках и расчётах между пользователями и не гарантирует добросовестность
          контрагентов. Подробнее — в{' '}
          <Link href='/terms' className='text-primary hover:underline'>
            Пользовательском соглашении
          </Link>
          .
        </p>
      }
      sections={SAFETY_SECTIONS}
      extraNav={[{ id: 'support', title: 'Поддержка' }]}
    >
      <SupportContacts intro='Заметили подозрительное объявление или столкнулись с мошенничеством? Сообщите нам:' />
    </GuidePage>
  )
}
