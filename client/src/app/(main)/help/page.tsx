import type { Metadata } from 'next'

import { StaticPagePlaceholder } from '@/components/layout'

import { buildPageMetadata } from '@/shared/utils/metadata'

const DESCRIPTION =
  'Мы готовим раздел с ответами на частые вопросы: как разместить объявление, как работают платные услуги продвижения и премиум, как связаться с поддержкой.'

export const metadata: Metadata = buildPageMetadata({
  title: 'Помощь',
  description: DESCRIPTION,
  path: '/help'
})

export default function HelpPage() {
  return (
    <StaticPagePlaceholder title='Помощь' description={DESCRIPTION} />
  )
}
