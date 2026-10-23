import { GuidePage, SupportContacts } from '@/components/layout'

import { HELP_SECTIONS } from '../constants/help-sections'

const LEAD =
  'Ответы на частые вопросы о работе площадки AgroZone: как разместить и продвинуть объявление, как проходит модерация, как подтвердить компанию и безопасно совершить сделку.'

export const HelpContent = () => {
  return (
    <GuidePage title='Помощь' lead={LEAD} sections={HELP_SECTIONS} extraNav={[{ id: 'support', title: 'Поддержка' }]}>
      <SupportContacts intro='Не нашли ответ на свой вопрос? Свяжитесь с нами любым удобным способом:' />
    </GuidePage>
  )
}
