import type { Metadata } from 'next'

import { StaticPagePlaceholder } from '@/components/layout'

import { buildPageMetadata } from '@/shared/utils/metadata'

const DESCRIPTION =
  'Здесь появятся рекомендации, как безопасно покупать и продавать на AgroZone: как проверять продавца, на что обращать внимание при оплате и личных встречах.'

export const metadata: Metadata = buildPageMetadata({
  title: 'Безопасность',
  description: DESCRIPTION,
  path: '/safety'
})

export default function SafetyPage() {
  return (
    <StaticPagePlaceholder title='Безопасность' description={DESCRIPTION} />
  )
}
