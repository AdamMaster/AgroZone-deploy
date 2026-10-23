import type { Metadata } from 'next'

import { HelpContent } from '@/components/features/help/components'

import { buildPageMetadata } from '@/shared/utils/metadata'

export const metadata: Metadata = buildPageMetadata({
  title: 'Помощь',
  description:
    'Справка AgroZone: как разместить объявление, пройти модерацию, продвинуть объявление и оформить Премиум, подтвердить компанию по ИНН и безопасно совершить сделку.',
  path: '/help'
})

export default function HelpPage() {
  return <HelpContent />
}
