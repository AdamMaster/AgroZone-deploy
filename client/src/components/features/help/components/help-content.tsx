import { siteSettingsService } from '@/components/features/site-settings/services/site-settings.service'
import { GuidePage, SupportContacts } from '@/components/layout'

import { HELP_SECTIONS } from '../constants/help-sections'
import { HELP_SELLER_RATINGS_SECTION } from '../constants/help-seller-ratings'

const LEAD =
  'Ответы на частые вопросы о работе площадки AgroZone: как разместить и продвинуть объявление, как проходит модерация, как подтвердить компанию и безопасно совершить сделку.'

// Раздел про отзывы показывается только при включённом тумблере
// sellerRatings и встаёт перед «Аккаунт и безопасность».
const buildSections = (sellerRatings: boolean) =>
  sellerRatings
    ? HELP_SECTIONS.flatMap(section => (section.id === 'account' ? [HELP_SELLER_RATINGS_SECTION, section] : [section]))
    : HELP_SECTIONS

export const HelpContent = async () => {
  const { sellerRatings } = await siteSettingsService.getPublicFlags()

  return (
    <GuidePage
      title='Помощь'
      lead={LEAD}
      sections={buildSections(sellerRatings)}
      extraNav={[{ id: 'support', title: 'Поддержка' }]}
    >
      <SupportContacts intro='Не нашли ответ на свой вопрос? Свяжитесь с нами любым удобным способом:' />
    </GuidePage>
  )
}
