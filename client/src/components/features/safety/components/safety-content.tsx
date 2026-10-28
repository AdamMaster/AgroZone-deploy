import Link from 'next/link'

import { siteSettingsService } from '@/components/features/site-settings/services/site-settings.service'
import { GuidePage, SupportContacts } from '@/components/layout'

import { SAFETY_SECTIONS } from '../constants/safety-sections'
import { SAFETY_REPUTATION_SECTION, SAFETY_SELLER_COMPLAINT_ITEM } from '../constants/safety-seller-ratings'

const LEAD =
  'Практические рекомендации для покупателей и продавцов агропромышленной продукции, техники и услуг: как проверить контрагента и товар, безопасно оплатить сделку, распознать мошенников и что делать, если вас обманули.'

// Разделы про рейтинг показываются только при включённом тумблере
// sellerRatings: «Отзывы и рейтинг» встаёт перед «Если вы продавец», а
// жалоба на продавца — сразу после жалобы на объявление.
const buildSections = (sellerRatings: boolean) => {
  if (!sellerRatings) {
    return SAFETY_SECTIONS
  }

  return SAFETY_SECTIONS.flatMap(section => {
    if (section.id === 'sellers') {
      return [SAFETY_REPUTATION_SECTION, section]
    }

    if (section.id === 'tools') {
      const [firstItem, ...otherItems] = section.items

      return [{ ...section, items: [firstItem, SAFETY_SELLER_COMPLAINT_ITEM, ...otherItems] }]
    }

    return [section]
  })
}

export const SafetyContent = async () => {
  const { sellerRatings } = await siteSettingsService.getPublicFlags()

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
      sections={buildSections(sellerRatings)}
      extraNav={[{ id: 'support', title: 'Поддержка' }]}
    >
      <SupportContacts intro='Заметили подозрительное объявление или столкнулись с мошенничеством? Сообщите нам:' />
    </GuidePage>
  )
}
